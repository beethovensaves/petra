import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";

import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const artifactPath = resolve(
  process.env.PETRA_WAVE5_ADVERSE_OUTPUT?.trim() ||
    resolve(root, "reports/WAVE5-UX-FX25-BROWSER-OBSERVATION.json"),
);
const backendSupportPath = resolve(
  root,
  "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
);
const fixturePath = "/test/wave5-adverse-browser.html";
const snapshotId = "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD";

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 5 UX-FX25 browser trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const sha256 = (base64) =>
  `sha256:${createHash("sha256").update(Buffer.from(base64, "base64")).digest("hex")}`;
const sha256Bytes = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const round = (value) => Math.round(value * 1_000) / 1_000;
const withoutRequestIdentity = (value) => {
  if (Array.isArray(value)) return value.map(withoutRequestIdentity);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.endsWith("_request_id"))
      .map(([key, entry]) => [key, withoutRequestIdentity(entry)]),
  );
};
const containsRendererAuthority = (value) => {
  if (Array.isArray(value)) return value.some(containsRendererAuthority);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, entry]) =>
      ["x", "y", "position", "coordinates", "pan", "zoom", "layout"].includes(
        key,
      ) || containsRendererAuthority(entry),
  );
};

const backendSupportBytes = readFileSync(backendSupportPath);
const backendSupport = JSON.parse(backendSupportBytes.toString("utf8"));
assert.equal(
  backendSupport.schema_name,
  "petra.wave5-adverse-state-performance-observation",
);
assert.equal(backendSupport.status, "pass");
assert.equal(backendSupport.fixture.dense_claims, 32);
assert.equal(backendSupport.fixture.dense_relationships, 33);

const calls = [];
const consoleFailures = [];
const networkFailures = [];
const observations = {
  dense: {},
  correction_preview: {},
  renderer_recovery: {},
  offline_recovery: {},
  stale_response: {},
  late_response: {},
  projection: {},
  temporal_and_comparison: {},
  responsive_accessibility: {},
};

const projectDataShim = {
  name: "petra-wave5-project-data-shim",
  enforce: "pre",
  resolveId(id, importer) {
    if (
      id === "./project-data.js" &&
      importer?.endsWith("/src/product/SuggestedAction.tsx")
    ) {
      return resolve(
        root,
        "apps/workbench/test/wave5-browser-project-data-shim.ts",
      );
    }
    return null;
  },
};

const vite = await createViteServer({
  root: resolve(root, "apps/workbench"),
  configFile: false,
  appType: "spa",
  logLevel: "silent",
  plugins: [projectDataShim, react()],
  resolve: {
    alias: {
      "@petra/contracts/validator": resolve(
        root,
        "apps/workbench/src/product/browser-contract-registry.ts",
      ),
      "@petra/core": resolve(
        root,
        "apps/workbench/test/wave5-browser-core-shim.ts",
      ),
      "@petra/adapters": resolve(
        root,
        "apps/workbench/test/wave5-browser-adapters-shim.ts",
      ),
    },
  },
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
await vite.listen();
const viteAddress = vite.httpServer?.address();
assert.ok(viteAddress !== null && typeof viteAddress === "object");
const workbenchUrl = `http://127.0.0.1:${viteAddress.port}`;
const chrome = await startChrome({ profilePrefix: "petra-wave5-browser-" });
const cdp = await createCdp(chrome.socketUrl);
const { send, evaluate, until } = cdp;

cdp.socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.consoleAPICalled") {
    if (["error", "assert"].includes(message.params?.type)) {
      consoleFailures.push(
        message.params.args?.map((argument) => argument.value),
      );
    }
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleFailures.push(message.params?.exceptionDetails);
  }
  if (message.method === "Network.loadingFailed") {
    networkFailures.push(message.params);
  }
  if (
    message.method === "Network.responseReceived" &&
    message.params?.response?.status >= 400
  ) {
    networkFailures.push({
      status: message.params.response.status,
      url: message.params.response.url,
    });
  }
});

const key = async (keyValue, code, keyCode, text = undefined) => {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    ...(text === undefined ? {} : { text }),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
  });
};

const navigate = async (mode, readyExpression, label) => {
  const started = performance.now();
  const navigation = await send("Page.navigate", {
    url: new URL(`${fixturePath}?mode=${mode}`, workbenchUrl).href,
  });
  assert.equal(navigation.errorText, undefined);
  try {
    await until(readyExpression, label);
  } catch (error) {
    const moduleResponse = await evaluate(
      'fetch("/test/wave5-adverse-browser.tsx").then(async (response) => ({ status: response.status, text: (await response.text()).slice(0, 4000) }))',
    );
    const moduleImport = await evaluate(
      'import("/test/wave5-adverse-browser.tsx").then(() => ({ ok: true })).catch((error) => ({ ok: false, error: error.stack ?? error.message ?? String(error) }))',
    );
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nModule import: ${JSON.stringify(moduleImport)}\nModule: ${JSON.stringify(moduleResponse)}\nNetwork: ${JSON.stringify(networkFailures)}\nConsole: ${JSON.stringify(consoleFailures)}`,
      { cause: error },
    );
  }
  await evaluate("document.fonts.ready");
  await evaluate(
    "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
  );
  return round(performance.now() - started);
};

const captureCanvas = async () => {
  const rect = await evaluate(`(() => {
    const element = document.querySelector(".focused-graph-production-canvas");
    const value = element.getBoundingClientRect();
    return {
      x: value.x + window.scrollX,
      y: value.y + window.scrollY,
      width: value.width,
      height: value.height,
    };
  })()`);
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...rect, scale: 1 },
  });
  return sha256(screenshot.data);
};

let failure;
try {
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Network.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  const browser = await send("Browser.getVersion");

  const denseFirstMs = await navigate(
    "dense",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready" && document.body.innerText.includes("32 objects · 33 relationships · 33 paths")',
    "dense UX-FX25 focused graph",
  );
  let body = await evaluate("document.body.innerText");
  const wideNoOverflow = await evaluate(
    "document.documentElement.scrollWidth <= window.innerWidth",
  );
  assert.equal(wideNoOverflow, true, "UX-FX25 overflowed at 1440px.");
  for (const meaning of [
    "CITES",
    "SUPPORTS",
    "CONTRADICTS",
    "QUALIFIES",
    "INFERS",
    "Eight additional members are capped",
    "One path is restricted",
    "Unprojected paths remain unknown rather than absent",
    "Four additional WorkingCandidate relationships are hidden",
    "One exact destination is missing from the retained snapshot",
    "WorkingCandidate event 40 is stale",
    "cycle",
  ]) {
    assert.ok(body.includes(meaning), `Dense fixture omitted ${meaning}.`);
  }
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".focused-graph-records > li").length',
    ),
    33,
  );
  assert.deepEqual(
    await evaluate(
      '[...document.querySelectorAll(".focused-graph-facts")].map((element) => element.dataset.meaning).filter((value, index, values) => values.indexOf(value) === index).sort()',
    ),
    ["citation", "contradiction", "inference", "qualification", "support"],
  );
  const firstCanvasHash = await captureCanvas();
  const denseSecondMs = await navigate(
    "dense",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "repeat dense layout",
  );
  const secondCanvasHash = await captureCanvas();
  assert.equal(
    firstCanvasHash,
    secondCanvasHash,
    "The same fixture and layout did not produce a stable canvas capture.",
  );
  observations.dense = {
    objects: 32,
    relationships: 33,
    paths: 33,
    cycle_relationships: 2,
    hidden_working_relationships: 4,
    restricted_paths: 1,
    partial_paths: 1,
    missing_destinations: 1,
    first_ready_ms: denseFirstMs,
    second_ready_ms: denseSecondMs,
    layout_capture_sha256: firstCanvasHash,
    repeated_layout_capture_sha256: secondCanvasHash,
    layout_capture_stable: true,
  };

  await navigate(
    "action",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "governed correction fixture",
  );
  const correctionRelationshipKey = "relationship:dense-0";
  assert.equal(
    await evaluate(`(() => {
      const container = document.querySelector(".focused-graph-production-canvas");
      const edge = container?._cyreg?.cy?.getElementById(${JSON.stringify(correctionRelationshipKey)});
      if (edge === undefined || edge.length !== 1) return false;
      edge.emit("tap");
      return true;
    })()`),
    true,
  );
  await until(
    `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(correctionRelationshipKey)}`,
    "Cytoscape pointer correction selection",
  );
  await evaluate(`${button("Preview edit relationship")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-action-preview") !== null',
    "pointer correction preview",
  );
  body = await evaluate("document.body.innerText");
  const normalizedCorrectionBody = body.toLowerCase();
  for (const text of [
    "exact existing candidate",
    "affected scope",
    "unchanged by this preview",
    "no command issued",
    "open this exact candidate in review",
    "renderer state was not accepted",
  ]) {
    assert.ok(
      normalizedCorrectionBody.includes(text),
      `Correction preview omitted ${text}:\n${body}`,
    );
  }
  const pointerRequest = await evaluate(
    "structuredClone(window.wave5ActionRequests[0])",
  );
  assert.equal(containsRendererAuthority(pointerRequest), false);
  await evaluate(`${button("Close preview and keep selection")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-action-preview") === null',
    "closed pointer correction preview",
  );
  const previewTriggerFocus = await evaluate(
    `document.activeElement === ${button("Preview edit relationship")}`,
  );
  assert.equal(previewTriggerFocus, true);
  await evaluate(`${button("Home")}.click()`);
  await evaluate(`(() => {
    const control = document.querySelector(".focused-graph-exploration__selection select");
    control.focus();
    control.value = ${JSON.stringify(correctionRelationshipKey)};
    control.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await until(
    `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(correctionRelationshipKey)}`,
    "non-drag correction selection",
  );
  await evaluate(`${button("Preview edit relationship")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-action-preview") !== null && window.wave5ActionRequests.length === 2',
    "non-drag correction preview",
  );
  const nonDragRequest = await evaluate(
    "structuredClone(window.wave5ActionRequests[1])",
  );
  assert.deepEqual(
    withoutRequestIdentity(nonDragRequest),
    withoutRequestIdentity(pointerRequest),
  );
  observations.correction_preview = {
    selected_relationship_key: correctionRelationshipKey,
    pointer_boundary: "production Cytoscape tap event in isolated Chrome",
    non_drag_boundary: "production selection control with keyboard activation",
    pointer_and_non_drag_request_match: true,
    renderer_fields_in_request: false,
    preview_trigger_focus_restored: previewTriggerFocus,
    command_issued: false,
  };

  await navigate(
    "renderer",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "failed"',
    "renderer failure fallback",
  );
  body = await evaluate("document.body.innerText");
  for (const text of [
    "Visual graph unavailable",
    "complete textual relationship records below remain available",
    "changed no Project data, selection, scope, or authority position",
  ]) {
    assert.ok(body.includes(text), `Renderer recovery omitted ${text}.`);
  }
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".focused-graph-records > li").length',
    ),
    33,
  );
  await evaluate(`${button("Retry visual graph")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "renderer retry",
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "node:claim-0",
  );
  observations.renderer_recovery = {
    textual_relationships_retained: 33,
    exact_selection_retained: "node:claim-0",
    retry_succeeded: true,
    project_effect_created: false,
  };

  await navigate(
    "offline",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "offline expansion fixture",
  );
  await evaluate(`${button("Expand selected object")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    `${button("Retry exact expansion")} !== undefined`,
    "offline recovery",
  );
  body = await evaluate("document.body.innerText");
  for (const text of [
    "Connection unavailable",
    "displayed cached current result",
    `retained response for snapshot ${snapshotId}`,
    "does not claim it is newer",
    "The focused graph endpoint is offline",
  ]) {
    assert.ok(body.includes(text), `Offline recovery omitted ${text}.`);
  }
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "node:claim-0",
  );
  await evaluate("window.wave5Online = true");
  await evaluate(`${button("Retry exact expansion")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.body.innerText.includes("Accepted Trace recorded sources for the exact active snapshot")',
    "exact expansion retry",
  );
  observations.offline_recovery = {
    attempts: await evaluate("window.wave5Calls.length"),
    first_outcome: await evaluate("window.wave5Calls[0].settled"),
    second_outcome: await evaluate("window.wave5Calls[1].settled"),
    cached_state_label: "displayed cached current result",
    task_retained: await evaluate(
      'document.querySelector("h1").textContent.trim()',
    ),
    selection_retained: await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    retry_succeeded: true,
    false_currentness_claim: false,
  };
  assert.equal(observations.offline_recovery.attempts, 2);

  await navigate(
    "stale",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "stale expansion response fixture",
  );
  await evaluate(`${button("Expand selected object")}.click()`);
  await until(
    `${button("Retry exact expansion")} !== undefined`,
    "stale response recovery",
  );
  body = await evaluate("document.body.innerText");
  for (const text of [
    "Mismatched expansion ignored",
    "did not match the active request, snapshot, scope, or selected object",
    "displayed cached current result remains the retained response",
  ]) {
    assert.ok(body.includes(text), `Stale response recovery omitted ${text}.`);
  }
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "node:claim-0",
  );
  await evaluate(`${button("Retry exact expansion")}.click()`);
  await until(
    'document.body.innerText.includes("Accepted Trace recorded sources for the exact active snapshot")',
    "stale response exact retry",
  );
  observations.stale_response = {
    mismatched_snapshot_event_position: 41,
    retained_snapshot_event_position: 42,
    mismatched_response_ignored: true,
    exact_selection_retained: "node:claim-0",
    retry_succeeded: true,
  };

  await navigate(
    "late",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "late response fixture",
  );
  await evaluate(`${button("Expand selected object")}.click()`);
  await wait(15);
  await evaluate(`${button("Radial")}.click()`);
  await until(
    `${button("Expand selected object")}.getAttribute("aria-busy") !== "true"`,
    "newer presentation state",
  );
  await evaluate(`${button("Expand selected object")}.click()`);
  await until(
    'window.wave5Calls.length === 2 && window.wave5Calls.every((call) => call.settled !== "pending")',
    "out-of-order responses",
  );
  const lateCalls = await evaluate("window.wave5Calls");
  const activeRequestId = await evaluate(
    'document.querySelector(".focused-graph-exploration").dataset.activeRequestId',
  );
  assert.equal(lateCalls[0].settled, "older_last");
  assert.equal(lateCalls[1].settled, "accepted_candidate");
  assert.equal(activeRequestId, lateCalls[1].requestId);
  assert.notEqual(activeRequestId, lateCalls[0].requestId);
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "node:claim-0",
  );
  observations.late_response = {
    completion_order: [lateCalls[1].requestId, lateCalls[0].requestId],
    accepted_request_id: activeRequestId,
    older_request_rejected: true,
    exact_selection_retained: "node:claim-0",
  };

  for (const state of ["current", "catching_up", "unavailable", "rebuilding"]) {
    await navigate(
      state,
      'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
      `projection ${state}`,
    );
    body = await evaluate("document.body.innerText");
    assert.ok(body.includes("PostgreSQL remains authoritative"));
    assert.ok(body.includes("rebuildable projection"));
    const positionText = await evaluate(
      '[...document.querySelectorAll("dt")].find((element) => element.textContent === "Projection position").nextElementSibling.textContent.trim()',
    );
    assert.ok(positionText.startsWith(state.replaceAll("_", " ")));
    const notice = await evaluate(
      'document.querySelector("#focused-graph-projection-title")?.textContent.trim() ?? null',
    );
    if (state === "current") assert.equal(notice, null);
    else assert.ok(notice.includes(state.replaceAll("_", " ")));
    observations.projection[state] = {
      position_text: positionText,
      notice,
      authority_source: "postgresql",
      projection_source: "neo4j_rebuildable_projection",
    };
  }

  await navigate(
    "historical",
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "historical unknown date",
  );
  body = await evaluate("document.body.innerText");
  assert.ok(body.includes("Historical · read only"));
  assert.ok(body.includes("historical · publication time · date unknown"));
  await navigate(
    "comparison",
    'document.querySelector("#focused-graph-analysis-facts-title") !== null',
    "incomplete comparison",
  );
  body = await evaluate("document.body.innerText");
  for (const text of [
    "Exact comparison",
    "Coverage · partial",
    "Common base unavailable",
    "Stale working base",
    "cannot establish an exact difference",
    "No difference, absence, or currentness is inferred",
  ]) {
    assert.ok(body.includes(text), `Incomplete comparison omitted ${text}.`);
  }
  await evaluate(`${button("Text")}.click()`);
  await until(
    'document.querySelector(".focused-graph-analysis__positions")?.dataset.focusedAnalysisPeer === "text"',
    "comparison textual peer",
  );
  await navigate(
    "impact",
    'document.querySelector(".focused-graph-analysis")?.dataset.analysisKind === "impact"',
    "supplied impact presentation",
  );
  body = await evaluate("document.body.innerText");
  for (const text of [
    "Impact and assessed consequences",
    "Exact semantic-target records",
    "Exact operational records",
    "Assessed consequences",
    "The supplied Review member identifies one exact affected Claim relationship.",
    "This supplied consequence is not inferred from graph topology.",
  ]) {
    assert.ok(body.includes(text), `Impact presentation omitted ${text}.`);
  }
  await evaluate(`${button("Text")}.click()`);
  await until(
    'document.querySelector(".focused-graph-analysis__positions")?.dataset.focusedAnalysisPeer === "text"',
    "impact textual peer",
  );
  observations.temporal_and_comparison = {
    historical_read_only: true,
    unknown_date_explicit: true,
    incomplete_comparison_explicit: true,
    stale_working_base_non_authoritative: true,
    comparison_textual_peer_executed: true,
    supplied_impact_executed: true,
    impact_textual_peer_executed: true,
    impact_boundary:
      "production presentation with deterministic injected typed view; no live impact route claimed",
  };

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [
      { name: "forced-colors", value: "active" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await navigate(
    "dense",
    'document.querySelector("[data-focused-peer=text]") !== null',
    "responsive adverse textual peer",
  );
  await evaluate('document.documentElement.style.fontSize = "200%"');
  await evaluate(
    "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
  );
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
    "UX-FX25 overflowed at 390px and 200% text.",
  );
  const media = await evaluate(`({
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
  })`);
  assert.deepEqual(media, {
    forcedColors: true,
    reducedMotion: true,
    coarsePointer: true,
  });
  assert.equal(
    await evaluate(
      'document.querySelector("[data-focused-peer=text]") !== null && document.querySelector(".focused-graph-production-canvas") === null',
    ),
    true,
    "A direct narrow entry did not start with the complete textual peer.",
  );
  const textAx = await send("Accessibility.getFullAXTree");
  await evaluate(`${button("Graph")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
    "keyboard graph alternative",
  );
  assert.equal(
    await evaluate(`document.activeElement === ${button("Graph")}`),
    true,
  );
  const graphAx = await send("Accessibility.getFullAXTree");
  const textControlRect = await evaluate(`(() => {
    const control = ${button("Text")};
    control.scrollIntoView({ block: "center", inline: "center" });
    const value = control.getBoundingClientRect();
    return { x: value.x + value.width / 2, y: value.y + value.height / 2, width: value.width, height: value.height };
  })()`);
  assert.ok(textControlRect.height >= 44);
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: textControlRect.x, y: textControlRect.y }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await until(
    'document.querySelector("[data-focused-peer=text]") !== null',
    "touch textual alternative",
  );
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
  );
  await evaluate(`${button("Save exact question")}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  await until(
    'document.querySelector(".focused-graph-saved-questions ol") !== null',
    "saved exact question",
  );
  for (let index = 0; index < 12; index += 1) {
    await evaluate(
      `${button(index % 2 === 0 ? "Radial" : "Relationship")}.click()`,
    );
  }
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration").dataset.historyCount',
    ),
    "10",
  );
  const savedQuestion =
    '[...document.querySelectorAll(".focused-graph-saved-questions button")].find((element) => element.textContent.includes("Which recorded relationships"))';
  await evaluate(`${savedQuestion}.focus()`);
  await key("Enter", "Enter", 13, "\r");
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "node:claim-0",
  );
  const forcedStyles = await evaluate(`({
    relationshipBorder: getComputedStyle(document.querySelector(".focused-graph-facts[data-meaning=contradiction]")).borderTopStyle,
    selectedBorder: getComputedStyle(document.querySelector(".focused-graph-facts[data-selected=true]") ?? document.querySelector(".focused-graph-facts")).borderTopColor,
    transition: getComputedStyle(${button("Graph")}).transitionDuration,
  })`);
  assert.notEqual(forcedStyles.relationshipBorder, "none");
  assert.ok(
    ["0s", "0.01ms", "0.00001s", "1e-05s"].includes(forcedStyles.transition),
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate(
    "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
  );
  const highZoomNoOverflow = await evaluate(
    "document.documentElement.scrollWidth <= window.innerWidth",
  );
  assert.equal(
    highZoomNoOverflow,
    true,
    "UX-FX25 overflowed at a 320px effective width and 200% text.",
  );
  const highZoomActions = await evaluate(`[
    ${button("Graph")},
    ${button("Expand selected object")},
    ${button("Inspect selected Details")}
  ].map((control) => control?.textContent.trim() ?? null)`);
  assert.deepEqual(highZoomActions, [
    "Graph",
    "Expand selected object",
    "Inspect selected Details",
  ]);
  const axNodes = [...textAx.nodes, ...graphAx.nodes];
  for (const heading of [
    "Entry scope and position",
    "Explore the exact bounded result",
    "Recorded relationship view",
    "Relationship evidence matrix",
  ]) {
    assert.ok(
      axNodes.some(
        (node) =>
          node.role?.value === "heading" && node.name?.value === heading,
      ),
      `Accessibility tree omitted ${heading}.`,
    );
  }
  body = await evaluate("document.body.innerText");
  for (const text of [
    "citation",
    "support",
    "contradiction",
    "qualification",
    "inference",
    "outgoing",
    "current authority",
    "working non authority",
    "Labels, direction words, symbols, and line patterns carry meaning",
  ]) {
    assert.ok(body.includes(text), `Non-color meaning omitted ${text}.`);
  }
  observations.responsive_accessibility = {
    tested_viewports_css_pixels: [
      { width: 1440, height: 1000, text_scale_percent: 100 },
      { width: 390, height: 844, text_scale_percent: 200 },
      { width: 320, height: 844, text_scale_percent: 200 },
    ],
    text_scale_percent: 200,
    wide_no_horizontal_document_overflow: wideNoOverflow,
    no_horizontal_document_overflow: true,
    high_zoom_no_horizontal_document_overflow: highZoomNoOverflow,
    high_zoom_actions_retained: highZoomActions,
    narrow_initial_representation: "text",
    touch_target_height_css_pixels: textControlRect.height,
    touch_text_alternative_succeeded: true,
    keyboard_graph_alternative_succeeded: true,
    keyboard_focus_retained: true,
    forced_colors: media.forcedColors,
    reduced_motion: media.reducedMotion,
    coarse_pointer: media.coarsePointer,
    forced_color_relationship_border: forcedStyles.relationshipBorder,
    reduced_transition_duration: forcedStyles.transition,
    ten_state_history_cap: 10,
    saved_exact_question_reopened: true,
    semantic_headings_in_accessibility_tree: true,
    native_screen_reader_invoked: false,
  };

  assert.deepEqual(calls, [], "The fixture unexpectedly called an API route.");
  assert.deepEqual(consoleFailures, []);
  const artifact = {
    schema_name: "petra.wave5-ux-fx25-browser-observation",
    schema_version: "1.0.0",
    slice: "wave5-slice20",
    status: "pass",
    recorded_at: new Date().toISOString(),
    environment: {
      node: process.version,
      browser: browser.product,
      browser_user_agent: browser.userAgent,
      protocol_version: browser.protocolVersion,
      platform: process.platform,
      architecture: process.arch,
      renderer: "Cytoscape production component in isolated headless Chrome",
    },
    fixture: {
      id: "UX-FX25",
      source: "apps/workbench/test/wave5-adverse-browser.tsx",
      production_components: [
        "FocusedGraphOrientationSurface",
        "FocusedGraphExploration",
        "FocusedGraphResult",
        "FocusedGraphDetails",
        "FocusedGraphActions",
        "FocusedGraphAnalysisSurface",
      ],
      synthetic_transport: true,
      backend_support_artifact:
        "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
    },
    backend_support: {
      artifact: "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
      artifact_sha256: sha256Bytes(backendSupportBytes),
      recorded_environment: backendSupport.environment,
      recorded_query_timings_ms: backendSupport.observations.query,
      recorded_projection_timings_ms: {
        initial_apply_ms:
          backendSupport.observations.projection.initial_apply_ms,
        dense_apply_ms: backendSupport.observations.projection.dense_apply_ms,
        rebuild_ms: backendSupport.observations.projection.rebuild_ms,
      },
      boundary:
        "Exact Slice 19 backend support consumed by this browser scenario; database and projection commands were not re-executed by Slice 20.",
    },
    observations,
    scenario_records: [
      {
        evidence_id: "UX1.5-EV01",
        scenario_id: "dense-temporal-adverse-fixture",
        status: "passed",
        boundary:
          "Production orientation, exploration, result, Details, analysis, and Cytoscape components ran in isolated Chrome with deterministic renderer-neutral UX-FX25 reads. No live backend transport or model call was made; the exact Slice 19 PostgreSQL/Neo4j artifact was consumed only as support.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "non-color-relation-semantics-browser",
        status: "passed",
        boundary:
          "Chrome exercised citation, support, contradiction, qualification, inference, selection, warnings, and authority layers using text, symbols, direction, origin, line treatment, and limitations. This is not a native-screen-reader or cross-browser claim.",
      },
      {
        evidence_id: "UX1.5-EV04",
        scenario_id: "dense-cyclic-performance",
        status: "passed",
        boundary:
          "Measured 32 objects, 33 relationships, 33 paths, a two-edge cycle, browser render timing, selection, environment, and identical repeated-layout screenshot hashes. Slice 19 query timings were retained as prior support, not rerun or promoted to an SLA.",
      },
      {
        evidence_id: "UX1.5-EV04",
        scenario_id: "stale-late-response-browser",
        status: "passed",
        boundary:
          "Injected snapshot event 41 was rejected while event 42 and its selection remained; exact retry succeeded. Deliberately out-of-order reads accepted only the newer request. Transport was deterministic and synthetic.",
      },
      {
        evidence_id: "UX1.5-EV04",
        scenario_id: "disconnected-offline-recovery-browser",
        status: "passed",
        boundary:
          "Injected offline delivery retained the task, selection, snapshot, cached-state label, and non-currentness boundary; retry succeeded without a domain effect. No physical-network or live-backend reconnect claim is made.",
      },
      {
        evidence_id: "UX1.5-EV04",
        scenario_id: "projection-rebuild-browser",
        status: "passed",
        boundary:
          "Production browser components rendered current, catching-up, unavailable, and rebuilding positions while preserving PostgreSQL authority and rebuildable Neo4j labeling. Database operations were not re-executed in this frontend command.",
      },
      {
        evidence_id: "UX1.5-EV04",
        scenario_id: "responsive-text-motion-touch-browser",
        status: "passed",
        boundary:
          "Chrome 152 exercised 1440px, 390px, and 320px viewports, 200% root text, textual-first narrow entry, keyboard focus, 44px synthesized touch, coarse pointer, forced colors, reduced motion, overflow, retained actions, and accessibility-tree headings. No physical-device, native-screen-reader, or cross-browser claim is made.",
      },
    ],
    authority_boundary: {
      postgresql_authoritative: true,
      neo4j_rebuildable_projection: true,
      renderer_neutral: true,
      renderer_or_layout_created_domain_effect: false,
      existing_review_and_work_owners_unchanged: true,
    },
    limitations: [
      "Observed timings are one-environment browser measurements, not an SLA or universal threshold.",
      "Chrome touch, coarse pointer, forced colors, and reduced motion are emulated; no physical touch device is claimed.",
      "Chrome accessibility-tree structure was inspected; native screen-reader evaluation is outside Wave 5.",
      "Synthetic transport isolates frontend adverse behavior; backend PostgreSQL and Neo4j outcomes remain in the exact Slice 19 support artifact.",
      "This command does not execute the broader keyboard-focus scenario across source inspection, actions, and return.",
    ],
  };
  mkdirSync(resolve(root, "reports"), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} catch (error) {
  failure = error;
} finally {
  try {
    if (cdp.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        send("Browser.close").catch(() => undefined),
        wait(2_000),
      ]);
    }
  } finally {
    cdp.socket.close();
    if (chrome.child.exitCode === null) {
      chrome.child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolveExit) =>
          chrome.child.addListener("close", resolveExit),
        ),
        wait(5_000),
      ]);
    }
    if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
    await vite.close();
    assert.ok(
      chrome.profile.startsWith(join(tmpdir(), "petra-wave5-browser-")),
    );
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
}

if (failure !== undefined) throw failure;
