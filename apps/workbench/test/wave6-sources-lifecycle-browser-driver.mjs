import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const stablePort = 4311;
const stableUrl = `http://127.0.0.1:${stablePort}`;
const registeredTitle = "Wave 6 lifecycle source";
const initialExactTitle = "A testable account of competing explanations";

const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const linkContaining = (label) =>
  `[...document.querySelectorAll("a")].find((element) => element.textContent.includes(${JSON.stringify(label)}))`;

const fieldControl = (label) => `(()=>{
  const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.querySelector(".petra-field__label")?.textContent.startsWith(${JSON.stringify(label)}));
  return field?.querySelector("input, textarea, select");
})()`;

const setTextArea = (label, value) => `(()=>{
  const control=[...document.querySelectorAll("textarea")].find((candidate)=>candidate.labels?.[0]?.textContent.includes(${JSON.stringify(label)}));
  if(!control) throw new Error("Missing textarea: " + ${JSON.stringify(label)});
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(control,${JSON.stringify(value)});
  control.dispatchEvent(new Event("input",{bubbles:true}));
})()`;

const closeChrome = async ({ chrome, cdp }) => {
  try {
    if (cdp.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
        new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
      ]);
    }
  } finally {
    cdp.socket.close();
    if (chrome.child.exitCode === null) chrome.child.kill("SIGTERM");
    await Promise.race([
      once(chrome.child, "close"),
      new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
    ]);
    if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};

export const startWave6SourcesLifecycleBrowser = async ({
  root,
  getBackendUrl,
  scenario,
}) => {
  const calls = [];
  const consoleFailures = [];
  let disconnectLocalCopyResponse = true;
  const localCopyCommandPath = `/api/commands/projects/${scenario.scientific_project_id}/sources/${scenario.local_copy_project_source_id}/local-copy-deletion`;
  const workbench = await startWorkbench({
    root,
    getBackendUrl,
    calls,
    port: stablePort,
    strictPort: true,
    shouldDisconnectResponse: (call) => {
      if (
        disconnectLocalCopyResponse &&
        call.method === "POST" &&
        call.path === localCopyCommandPath &&
        call.status >= 200 &&
        call.status < 300
      ) {
        disconnectLocalCopyResponse = false;
        return true;
      }
      return false;
    },
  });
  assert.equal(workbench.url, stableUrl);
  const chrome = await startChrome({
    profilePrefix: "petra-wave6-sources-lifecycle-",
  });
  const cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  let closed = false;

  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "assert"].includes(message.params?.type)
    ) {
      consoleFailures.push(
        message.params.args?.map(
          (argument) => argument.value ?? argument.description,
        ),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      consoleFailures.push(
        message.params?.exceptionDetails?.exception?.description ??
          message.params?.exceptionDetails,
      );
    }
  });

  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  const browserVersion = await send("Browser.getVersion");
  const capture = async (name) => {
    const directory = process.env.PETRA_FRONTEND_VISUAL_CAPTURE_DIR;
    if (directory === undefined) return;
    mkdirSync(directory, { recursive: true });
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(resolve(directory, `${name}.png`), screenshot.data, "base64");
  };

  const summarizeCalls = () =>
    calls.slice(-20).map((call) => ({
      method: call.method,
      path: call.path,
      status: call.status,
      request_schema: call.requestJson?.schema_name,
      response_schema: call.json?.schema_name,
      error_code: call.json?.error?.code,
    }));
  const navigate = async (path, ready, label) => {
    const navigation = await send("Page.navigate", {
      url: new URL(path, workbench.url).href,
    });
    assert.equal(navigation.errorText, undefined);
    try {
      await until(ready, label);
      await evaluate("document.fonts.ready");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(summarizeCalls())}\nConsole: ${JSON.stringify(consoleFailures)}`,
        { cause: error },
      );
    }
  };
  const setField = async (label, value) =>
    evaluate(`(()=>{
      const control=${fieldControl(label)};
      if(!control) throw new Error("Missing field: " + ${JSON.stringify(label)});
      const prototype=control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : control instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype,"value").set.call(control,${JSON.stringify(value)});
      control.dispatchEvent(new Event(control instanceof HTMLSelectElement?"change":"input",{bubbles:true}));
      control.dispatchEvent(new Event("change",{bubbles:true}));
    })()`);
  const setFile = async (label, name, content, mediaType = "text/plain") =>
    evaluate(`(()=>{
      const input=${fieldControl(label)};
      if(!(input instanceof HTMLInputElement) || input.type!=="file") throw new Error("Missing file field: " + ${JSON.stringify(label)});
      const transfer=new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(content)}],${JSON.stringify(name)},{type:${JSON.stringify(mediaType)}}));
      input.files=transfer.files;
      input.dispatchEvent(new Event("change",{bubbles:true}));
    })()`);
  const check = async (label) =>
    evaluate(`(()=>{
      const input=[...document.querySelectorAll("label")].find((candidate)=>candidate.textContent.trim()===${JSON.stringify(label)})?.querySelector('input[type="checkbox"]');
      if(!input) throw new Error("Missing checkbox: " + ${JSON.stringify(label)});
      if(!input.checked) input.click();
    })()`);
  const latestCall = (predicate) => [...calls].reverse().find(predicate);
  const assertClientBoundary = (call, label) => {
    assert.ok(call, `${label} was not transported.`);
    assert.equal(call.authorization, "Bearer petra-local-development");
    for (const key of ["actor", "capability_grant_id", "recorded_at"]) {
      assert.equal(
        key in (call.requestJson ?? {}),
        false,
        `${label} supplied server-owned ${key}.`,
      );
    }
  };

  const scientificSources = `/projects/${scenario.scientific_project_id}/sources`;
  await navigate(
    scientificSources,
    'document.querySelector(".reference-source-list") !== null',
    "scientific Sources collection",
  );
  const initialListCall = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path ===
        `/api/queries/projects/${scenario.scientific_project_id}/sources`,
  );
  assert.equal(initialListCall?.status, 200);
  assert.equal(
    initialListCall?.authorization,
    "Bearer petra-local-development",
  );
  await until(
    'document.querySelector(".reference-agent-composer .petra-composer") !== null',
    "ready Agent request composer",
  );
  await capture("sources-collection-desktop");
  const agentLayout = await evaluate(`(() => {
    const task = document.querySelector(".reference-agent-control-slot .reference-agent-control");
    const composer = document.querySelector(".reference-agent-composer");
    const send = [...document.querySelectorAll(".reference-agent-composer button")].find((button) => button.textContent.trim() === "Ask Petra");
    return {
      taskBottom: task?.getBoundingClientRect().bottom,
      composerTop: composer?.getBoundingClientRect().top,
      sendBottom: send?.getBoundingClientRect().bottom,
      viewportBottom: window.innerHeight,
    };
  })()`);
  assert.ok(
    Number(agentLayout.taskBottom) <= Number(agentLayout.composerTop),
    `The Agent composer covers the current Source task: ${JSON.stringify(agentLayout)}`,
  );
  assert.ok(
    Number(agentLayout.sendBottom) <= Number(agentLayout.viewportBottom),
    `Ask Petra is outside the first desktop screen: ${JSON.stringify(agentLayout)}`,
  );
  assert.equal(
    await evaluate(
      `Boolean(${fieldControl("Find Sources")}?.closest('.reference-agent-panel'))`,
    ),
    true,
    "Source discovery must enter through the Agent.",
  );
  await setField("Find Sources", initialExactTitle);
  await until(
    `document.querySelectorAll(".reference-source-row").length===1 && document.body.innerText.includes(${JSON.stringify(initialExactTitle)})`,
    "visible source Find result",
  );
  const sourceCount = await evaluate(
    'document.querySelector(".reference-source-toolbar [role=status]").textContent.trim()',
  );
  assert.match(sourceCount, /^1 of \d+$/u);
  const filteredInspectHref = await evaluate(`(()=>{
    const row=[...document.querySelectorAll(".reference-source-row")].find((candidate)=>candidate.textContent.includes(${JSON.stringify(initialExactTitle)}));
    const link=[...row.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Inspect"));
    const url=new URL(link.href);
    return url.pathname+url.search;
  })()`);
  assert.ok(filteredInspectHref.includes("from=sources"));
  assert.ok(filteredInspectHref.includes("sourceQuery="));
  await evaluate(`(()=>{
    const row=[...document.querySelectorAll(".reference-source-row")].find((candidate)=>candidate.textContent.includes(${JSON.stringify(initialExactTitle)}));
    [...row.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Inspect")).click();
  })()`);
  await until(
    `document.querySelector(".reference-reader")!==null && document.body.innerText.includes(${JSON.stringify(initialExactTitle)})`,
    "exact retained source reader",
  );
  const initialSourceCall = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path.includes(
        `/projects/${scenario.scientific_project_id}/sources/`,
      ) &&
      call.json?.content?.identity?.title === initialExactTitle,
  );
  assert.equal(initialSourceCall?.status, 200);
  for (const exactText of [
    "Results / Paragraph 1",
    "Page 1 · Results / Paragraph 1",
    "The study reports a measurable improvement.",
    "Downstream use",
  ]) {
    assert.ok(
      (await evaluate("document.body.innerText")).includes(exactText),
      `Exact inspection omitted ${exactText}.`,
    );
  }
  await evaluate(`${linkContaining("Return to Sources")}.click()`);
  await until(
    `window.location.pathname===${JSON.stringify(scientificSources)} && ${fieldControl("Find Sources")}?.value===${JSON.stringify(initialExactTitle)}`,
    "filtered Sources contextual return",
  );
  assert.equal(await evaluate("window.location.hash"), "#source-reuse-return");
  await setField("Find Sources", "");

  assert.equal(
    await evaluate(
      `${button("Add Source")}?.closest('.reference-agent-panel') !== null`,
    ),
    true,
    "Source registration must begin in the persistent Agent",
  );
  await evaluate(`${button("Add Source")}.click()`);
  await until(
    'document.querySelector(".source-registration-panel")!==null',
    "source registration form",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.source-registration-panel')?.closest('.reference-workspace-panel') !== null",
    ),
    true,
    "The reviewed source and rights form must remain in the Workspace",
  );
  await setField("Title", registeredTitle);
  await setField("Authors", "Ada Lifecycle");
  await setField("Version label", "First reviewed copy");
  await setField("Publication status", "accepted");
  await setField("Metadata source", "Wave 6 browser review");
  await setField("Metadata record ID", "wave6-source-v1");
  await setField("Metadata observed at", "2026-09-20T10:00");
  await setFile(
    "Source file",
    "wave6-source-v1.pdf",
    "%PDF-1.4 Wave 6 source lifecycle first exact bytes.",
    "application/pdf",
  );
  await setField("Material kind", "pdf");
  await setField("Source location", "https://example.test/wave6-source-v1.pdf");
  await setField("License status", "known");
  await setField("Observed license identifier", "CC-BY-4.0");
  await setField("Access basis", "open_license");
  await setField("Rights decision status", "verified");
  await check("Store this exact copy");
  await check("Parse its content");
  await check("Index its content");
  await setField(
    "Rights rationale",
    "The exact supplied copy carries the reviewed open license.",
  );
  await setField("Rights observed at", "2026-09-20T10:01");
  await setField("Rights policy version", "petra-local-rights-v1");
  await setField("Review completed at", "2026-09-20T10:02");
  await evaluate(`${button("Register and link source")}.click()`);
  await until(
    'document.body.innerText.includes("Source added to this Project")',
    "retained visible source registration",
  );
  const registrationCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/sources/register"),
  );
  assertClientBoundary(registrationCall, "Source registration");
  assert.equal(registrationCall.status, 201);
  assert.equal(registrationCall.json.applied, true);
  assert.equal(
    registrationCall.requestJson.source_identity.title,
    registeredTitle,
  );
  const registeredSourceId =
    registrationCall.json.receipt.destination.project_source_id;
  const registeredInspectPath = await evaluate(`(()=>{
    const url=new URL(${linkContaining("Inspect registered source")}.href);
    return url.pathname+url.search;
  })()`);
  await evaluate(`${linkContaining("Inspect registered source")}.click()`);
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/sources/${registeredSourceId}`)}) && document.body.innerText.includes(${JSON.stringify(registeredTitle)})`,
    "registered exact source",
  );
  const registeredOpen = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path ===
        `/api/queries/projects/${scenario.scientific_project_id}/sources/${registeredSourceId}`,
  );
  assert.equal(registeredOpen?.status, 200);
  assert.equal(
    registeredOpen?.json?.content?.representation?.extent,
    "identity_only",
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(
      "Only identity is available",
    ),
  );
  await capture("source-desktop");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 820,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await capture("source-mobile");
  const sourceScale = await evaluate(`(() => {
    document.documentElement.style.fontSize = '200%';
    const panel = document.querySelector('.reference-workspace-panel');
    const right = panel.getBoundingClientRect().right;
    return {
      client: panel.clientWidth,
      content: panel.scrollWidth,
      protruding: [...panel.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > right + 1)
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          right: Math.round(element.getBoundingClientRect().right),
          scroll: element.scrollWidth,
          client: element.clientWidth,
        })),
    };
  })()`);
  await capture("source-mobile-200");
  assert.ok(
    sourceScale.content <= sourceScale.client + 1,
    `The live Source task clips at 200% text scale: ${JSON.stringify(sourceScale)}`,
  );
  await evaluate("document.documentElement.style.fontSize = ''");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await evaluate(
    "document.querySelector('.reference-workspace-inspect')?.click()",
  );
  await until(
    `window.location.pathname.endsWith('/inspect') && document.querySelector('.reference-workspace-panel')?.dataset.workspaceObjectRef === ${JSON.stringify(registeredSourceId)} && document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(registeredTitle)}) && document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(registrationCall.json.receipt.receipt_id)})`,
    "live exact source inspection",
  );
  await until(
    'document.querySelector(".reference-inspect__processing")?.textContent.includes("Processing state")',
    "exact Source processing and representation in Inspect",
  );
  await send("Page.reload", { ignoreCache: true });
  await until(
    `performance.getEntriesByType('navigation')[0]?.type === 'reload' && document.readyState === 'complete' && window.location.pathname.endsWith('/inspect') && document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(registrationCall.json.receipt.receipt_id)}) && document.querySelector('.reference-inspect')?.textContent.includes('Retained registration receipt')`,
    "retained registration receipt after a fresh page load",
  );
  await capture("source-inspect-desktop");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 820,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await capture("source-inspect-mobile");
  const inspectScale = await evaluate(`(() => {
    document.documentElement.style.fontSize = '200%';
    const panel = document.querySelector('.reference-inspect');
    return { client: panel.clientWidth, content: panel.scrollWidth };
  })()`);
  assert.ok(
    inspectScale.content <= inspectScale.client + 1,
    `Live Source Inspect clips at 200% text scale: ${JSON.stringify(inspectScale)}`,
  );
  await evaluate("document.documentElement.style.fontSize = ''");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-inspect__intro a')?.getAttribute('href')",
    ),
    registeredInspectPath,
  );
  await evaluate(
    "document.querySelector('.reference-inspect__intro a')?.click()",
  );
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/sources/${registeredSourceId}`)}) && document.querySelector('#source-processing') !== null`,
    "live exact source return from Inspect",
  );

  await until(
    `${button("Process source")} !== undefined`,
    "processing command availability",
  );
  assert.equal(
    await evaluate(
      `${button("Process source")}?.closest('.reference-agent-panel') !== null`,
    ),
    true,
    "Source processing must begin in the persistent Agent",
  );
  await evaluate(`${button("Process source")}.click()`);
  await until(
    'document.body.innerText.includes("Processing Work started")',
    "bounded processing Work start",
  );
  const processingCall = latestCall(
    (call) =>
      call.method === "POST" &&
      call.path.endsWith(`/${registeredSourceId}/processing`),
  );
  assertClientBoundary(processingCall, "Source processing");
  assert.equal(processingCall.status, 201);
  assert.equal(processingCall.json.applied, true);
  const processingWorkId =
    processingCall.json.receipt.work_unit_ref.work_unit_id;
  await evaluate(`${linkContaining("Open processing Work")}.click()`);
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/work/${processingWorkId}`)}) && document.querySelector(".work-detail")!==null`,
    "processing Work detail",
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(
      "Process the exact source copy",
    ),
  );
  await evaluate(`${linkContaining("Return to source processing")}.click()`);
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/sources/${registeredSourceId}`)}) && document.querySelector("#source-processing")!==null`,
    "exact source return from processing Work",
  );

  await evaluate(`${button("Add new version")}.click()`);
  await until(
    'document.body.innerText.includes("Governed replacement review")',
    "new source version form",
  );
  await setField("Version label", "Corrected reviewed copy");
  await setField("Publication status", "corrected");
  await setField("Metadata source", "Wave 6 publisher correction");
  await setField("Metadata record ID", "wave6-source-v2");
  await setField("Metadata observed at", "2026-09-20T10:10");
  await setFile(
    "New version file",
    "wave6-source-v2.txt",
    "Wave 6 source lifecycle corrected exact bytes.",
  );
  await setField("Material kind", "structured_text");
  await setField("Source location", "https://example.test/wave6-source-v2.txt");
  await setField("License status", "known");
  await setField("Observed license identifier", "CC-BY-4.0");
  await setField("Access basis", "open_license");
  await setField("Rights decision status", "verified");
  await check("Store this exact copy");
  await check("Parse its content");
  await check("Index its content");
  await setField(
    "Rights rationale",
    "The corrected exact copy carries the same reviewed open license.",
  );
  await setField("Rights observed at", "2026-09-20T10:11");
  await setField("Rights policy version", "petra-local-rights-v1");
  await setField(
    "Why this is the newer version",
    "The publisher identifies this exact copy as the corrected version.",
  );
  await setField("Replacement reviewed at", "2026-09-20T10:12");
  await evaluate(`${button("Add new immutable version")}.click()`);
  await until(
    'document.body.innerText.includes("New immutable version added")',
    "retained new source version",
  );
  const revisionCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/revisions"),
  );
  assertClientBoundary(revisionCall, "Source revision");
  assert.equal(revisionCall.status, 201);
  assert.equal(revisionCall.json.applied, true);
  const successorSourceId =
    revisionCall.json.receipt.successor_source_ref.project_source_id;
  await evaluate(`${button("Review and exclude earlier version")}.click()`);
  await until(
    'document.body.innerText.includes("Earlier version excluded")',
    "explicit predecessor Project-link removal",
  );
  const predecessorExclusionCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/lifecycle"),
  );
  assertClientBoundary(predecessorExclusionCall, "Predecessor exclusion");
  assert.equal(predecessorExclusionCall.status, 200);
  await evaluate(`${button("Record version replacement")}.click()`);
  await until(
    'document.body.innerText.includes("Newer-version relationship recorded")',
    "explicit source replacement relationship",
  );
  const replacementCall = latestCall(
    (call) =>
      call.method === "POST" && call.path.endsWith("/source-replacements"),
  );
  assertClientBoundary(replacementCall, "Source replacement");
  assert.equal(replacementCall.status, 200);
  await evaluate(`${linkContaining("Inspect new version")}.click()`);
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/sources/${successorSourceId}`)}) && document.body.innerText.includes(${JSON.stringify(registeredTitle)})`,
    "exact corrected source",
  );
  const successorOpen = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path ===
        `/api/queries/projects/${scenario.scientific_project_id}/sources/${successorSourceId}`,
  );
  assert.equal(successorOpen?.status, 200);
  assert.equal(
    successorOpen?.json?.content?.identity?.version_label,
    "Corrected reviewed copy",
  );

  const writingSources = `/projects/${scenario.writing_project_id}/sources`;
  await navigate(
    writingSources,
    'document.querySelector(".reference-source-list")!==null',
    "controlled-writing Sources collection",
  );
  await evaluate(`(()=>{
    const control=[...document.querySelectorAll("button")].find((candidate)=>candidate.textContent.trim().startsWith("Use existing"));
    if(!control) throw new Error("Missing existing-source control");
    if(!control.closest('.reference-agent-panel')) throw new Error("Source reuse did not begin in the Agent");
    control.click();
  })()`);
  await until(
    `document.querySelector(".source-reuse-panel")!==null && document.body.innerText.includes(${JSON.stringify(registeredTitle)})`,
    "permitted existing-source choices",
  );
  const reuseOptionsCall = latestCall(
    (call) =>
      call.method === "GET" && call.path.endsWith("/source-reuse-options"),
  );
  assert.equal(reuseOptionsCall?.status, 200);
  assert.equal(
    reuseOptionsCall?.json?.profile?.definition_family,
    "petra.controlled-writing",
  );
  await evaluate(`(()=>{
    const choice=[...document.querySelectorAll(".source-reuse-candidate")].find((candidate)=>candidate.textContent.includes(${JSON.stringify(registeredTitle)}));
    const input=choice?.querySelector('input[type="radio"]');
    if(!input) throw new Error("Missing registered source reuse choice");
    input.click();
  })()`);
  await evaluate(
    'document.querySelector(".source-reuse-panel form button[type=submit]").click()',
  );
  await until(
    `window.location.pathname.startsWith(${JSON.stringify(`${writingSources}/project_source_`)}) && document.querySelector(".reference-reader")!==null`,
    "source reuse contextual destination",
  );
  const reuseCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/sources/reuse"),
  );
  assertClientBoundary(reuseCall, "Source reuse");
  assert.equal(reuseCall.status, 201);
  assert.equal(reuseCall.json.applied, true);
  assert.equal(reuseCall.json.receipt.material_outcome.bytes_cloned, false);
  const reusedSourceId = reuseCall.json.receipt.destination.project_source_id;
  assert.ok(
    (await evaluate("window.location.pathname")).endsWith(
      `/sources/${reusedSourceId}`,
    ),
  );
  await evaluate(`${button("Remove from Project")}.click()`);
  await until(
    'document.body.innerText.includes("Exact link and freshness") && document.body.innerText.includes("Retention boundary")',
    "reused source Project-link preview",
  );
  await evaluate(
    setTextArea(
      "Reason for removing this Project link",
      "The paired-profile reuse was inspected and no longer belongs in this controlled-writing Project.",
    ),
  );
  await evaluate(`${button("Confirm Project-link removal")}.click()`);
  await until(
    'document.body.innerText.includes("Removed from this Project")',
    "reused source Project-link removal",
  );
  const linkRemovalCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/link-removal"),
  );
  assertClientBoundary(linkRemovalCall, "Project-link removal");
  assert.equal(linkRemovalCall.status, 201);
  assert.equal(linkRemovalCall.json.applied, true);

  const localCopyPath = `/projects/${scenario.scientific_project_id}/sources/${scenario.local_copy_project_source_id}?from=sources&sourceQuery=Local-copy`;
  await navigate(
    localCopyPath,
    `document.querySelector(".reference-reader")!==null && document.body.innerText.includes(${JSON.stringify(scenario.local_copy_title)})`,
    "eligible exact local copy",
  );
  await evaluate(`${button("Delete local copy")}.click()`);
  await until(
    'document.body.innerText.includes("Exact copy is eligible") && document.body.innerText.includes("What remains and what changes")',
    "eligible local-copy deletion preview",
  );
  const deletionPreviewCall = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path.endsWith(
        `/${scenario.local_copy_project_source_id}/local-copy-deletion`,
      ),
  );
  assert.equal(deletionPreviewCall?.status, 200);
  assert.equal(deletionPreviewCall?.json?.eligibility?.state, "eligible");
  await evaluate(
    setTextArea(
      "Reason for deleting this exact local copy",
      "The registered origin can safely supply these exact walkthrough bytes again.",
    ),
  );
  await evaluate(`${button("Confirm exact local-copy deletion")}.click()`);
  await until(
    'document.body.innerText.includes("Deletion outcome not confirmed")',
    "honest interrupted local-copy result",
  );
  const deletionCall = latestCall(
    (call) => call.method === "POST" && call.path === localCopyCommandPath,
  );
  assertClientBoundary(deletionCall, "Local-copy deletion");
  assert.equal(deletionCall.status, 201);
  assert.equal(deletionCall.json.applied, true);
  await evaluate(`${button("Check deletion effect")}.click()`);
  await until(
    'document.body.innerText.includes("Local-copy deletion confirmed")',
    "visible durable local-copy recovery",
  );
  const deletionRecoveryCall = latestCall(
    (call) =>
      call.method === "POST" &&
      call.path.endsWith(
        `/${scenario.local_copy_project_source_id}/local-copy-deletion-recovery`,
      ),
  );
  assert.equal(deletionRecoveryCall?.status, 200);
  assert.equal(deletionRecoveryCall?.json?.effect?.state, "effect_confirmed");
  assert.deepEqual(
    deletionRecoveryCall?.requestJson,
    deletionCall.requestJson,
    "Local-copy recovery changed the exact reviewed request.",
  );
  const exactReturnPath = await evaluate(`(()=>{
    const link=${linkContaining("Return to the exact source task")};
    const url=new URL(link.href);
    return url.pathname+url.search;
  })()`);
  assert.equal(exactReturnPath, localCopyPath);
  await evaluate(
    `${linkContaining("Return to the exact source task")}.click()`,
  );
  await until(
    `window.location.pathname.endsWith(${JSON.stringify(`/sources/${scenario.local_copy_project_source_id}`)}) && document.querySelector(".reference-reader")!==null`,
    "exact source after recovered deletion",
  );
  await evaluate(`${linkContaining("Return to Sources")}.click()`);
  await until(
    `window.location.pathname===${JSON.stringify(scientificSources)} && ${fieldControl("Find Sources")}?.value==="Local-copy"`,
    "final Sources task-context return",
  );

  const accessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "main" || node.role?.value === "heading",
    ),
  );
  assert.deepEqual(consoleFailures, []);

  const summarize = (call) => ({
    method: call.method,
    path: call.path,
    status: call.status,
    request_schema: call.requestJson?.schema_name,
    response_schema: call.json?.schema_name,
    applied: call.json?.applied,
  });
  const observation = {
    browser: browserVersion.product,
    stable_url: `${stableUrl}${scientificSources}`,
    scientific_project_id: scenario.scientific_project_id,
    writing_project_id: scenario.writing_project_id,
    sources: {
      initial_exact_source_id: initialSourceCall.json.project_source_id,
      registered_source_id: registeredSourceId,
      successor_source_id: successorSourceId,
      reused_source_id: reusedSourceId,
      local_copy_source_id: scenario.local_copy_project_source_id,
    },
    operations: {
      find: {
        query: initialExactTitle,
        result_count: 1,
        collection: summarize(initialListCall),
      },
      open: summarize(initialSourceCall),
      register: summarize(registrationCall),
      processing: summarize(processingCall),
      add_revision: summarize(revisionCall),
      exclude_predecessor: summarize(predecessorExclusionCall),
      record_replacement: summarize(replacementCall),
      reuse: summarize(reuseCall),
      remove_project_link: summarize(linkRemovalCall),
      delete_local_copy: summarize(deletionCall),
      recover_local_copy_effect: summarize(deletionRecoveryCall),
    },
    presentation: {
      find_entry: "agent",
      registration_entry: "agent",
      registration_review: "workspace",
      processing_entry: "agent",
      reuse_entry: "agent",
      inspect_exact_source_and_return: true,
      inspect_registration_receipt_after_reload: true,
      inspect_source_processing_and_representation: true,
      source_and_inspect_200_percent_text_scale: true,
      agent_composer_visible_without_covering_source_controls: true,
    },
    exact_return: {
      initial_filtered_collection: `${scientificSources}?query=${encodeURIComponent(initialExactTitle)}#source-reuse-return`,
      processing_work_to_source: true,
      local_copy_task: exactReturnPath,
      final_filter: "Local-copy",
    },
    checks: [
      "Find filtered a renderer-neutral, server-owned Project collection",
      "Source discovery entered through the Agent while results stayed in Workspace",
      "Ask Petra stayed in the first desktop screen without covering the Source task",
      "Open inspected complete exact content and returned to the preserved filter",
      "registration retained reviewed identity, exact bytes, rights, and Project role",
      "Agent entry opened the detailed registration and rights review in Workspace",
      "single Inspect entry resolved the retained registration receipt after reload and returned to the exact source task",
      "live Source and Inspector fit the 420 px workspace at 200% text scale",
      "processing started bounded durable Work and returned to the exact source task",
      "new revision intake retained a distinct successor",
      "predecessor exclusion and version-replacement relationship remained separate visible commands",
      "paired-profile reuse linked existing identity and bytes without cloning them",
      "Project-link removal retained identity, material, dependencies, and provenance",
      "eligible local-copy deletion exposed distinct retention consequences",
      "an interrupted command response recovered the exact durable effect without false success",
      "no browser console or runtime failures",
    ],
  };

  const artifact = {
    schema_name: "petra.wave6-sources-lifecycle-browser-observation",
    schema_version: "1.0.0",
    status: "passed",
    recorded_at: new Date().toISOString(),
    command:
      process.env.PETRA_EVIDENCE_COMMAND ??
      "node apps/workbench/test/run-wave6-sources-lifecycle-browser.mjs",
    environment: {
      node: process.versions.node,
      browser: observation.browser,
      workbench:
        "stable production React Router URL, source loaders and visible lifecycle components",
      transport: "authenticated live HTTP",
      persistence: "fresh disposable PostgreSQL and S3",
    },
    observation,
    scenario_records: [
      {
        evidence_id: "UX1.6-SOURCES",
        scenario_id: "register-process-inspect-replace",
        status: "passed",
        boundary:
          "Isolated Chrome executed the production Sources collection, exact reader, visible registration, processing Work, immutable revision, predecessor exclusion, replacement, paired-profile reuse, Project-link removal, eligible local-copy deletion, durable recovery, and exact return controls through authenticated live HTTP backed by fresh disposable PostgreSQL and S3. ProjectSourceDiscoveryClient validated collection and exact reads; registered server owners retained all identities, authorization, commands, storage, Work, and recovery authority.",
      },
    ],
    limitations: [
      "This focused record does not claim the complete guided-core-path, Graph, History, responsive-accessibility, adverse-state, operations, critic, exit, or user-acceptance scenarios.",
      "Source processing Work is started and inspected as durable active Work; this trace does not run an external document worker to terminal completion.",
      "The retained stable URL exists for the complete isolated execution and is stopped when the evidence command exits.",
    ],
  };
  const reportPath = resolve(
    process.env.PETRA_WAVE6_SOURCES_BROWSER_OUTPUT ??
      "reports/WAVE6-SOURCES-LIFECYCLE-BROWSER.json",
  );
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(artifact, null, 2)}\n`);

  return { observation, reportPath, close };

  async function close() {
    if (closed) return;
    closed = true;
    try {
      await closeChrome({ chrome, cdp });
    } finally {
      await workbench.vite.close();
    }
  }
};
