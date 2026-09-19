import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";

const chromePath =
  process.env.PETRA_CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const progress = (message) =>
  process.stderr.write(`[wave4-browser] ${message}\n`);

const readRequestBody = (request) =>
  new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", rejectBody);
  });

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const startWorkbench = async ({
  root,
  getBackendUrl,
  calls,
  getInspectionLinks,
  shouldDisconnectResponse,
  port = 0,
  strictPort = false,
}) => {
  const liveRouteProxy = {
    name: "petra-wave4-live-route-proxy",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.originalUrl ?? request.url ?? "/";
        if (
          path === "/__wave5-inspection" &&
          getInspectionLinks !== undefined
        ) {
          const links = getInspectionLinks();
          response.statusCode = 200;
          response.setHeader("content-type", "text/html; charset=utf-8");
          response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Petra Wave 5 inspection</title>
    <style>
      body { max-width: 52rem; margin: 4rem auto; padding: 0 1.5rem; color: #17201c; background: #f5f2e9; font: 1rem/1.5 system-ui, sans-serif; }
      h1 { font: 700 2rem/1.2 Georgia, serif; }
      li { margin: 1rem 0; }
      a { color: #185f46; font-weight: 700; }
      code { font-size: 0.85rem; overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <h1>Wave 5 inspection</h1>
    <p>These views use the migrated, seeded, disposable Wave 5 stores. Return to Terminal and press Enter when you are finished.</p>
    <ul>${links
      .map(
        ({ label, url }) =>
          `<li><a href="${escapeHtml(url)}">${escapeHtml(label)}</a><br /><code>${escapeHtml(url)}</code></li>`,
      )
      .join("")}</ul>
  </body>
</html>`);
          return;
        }
        if (!path.startsWith("/api/") && !path.startsWith("/health")) {
          next();
          return;
        }
        try {
          const requestBody = await readRequestBody(request);
          const headers = new Headers();
          for (const [name, value] of Object.entries(request.headers)) {
            if (
              value !== undefined &&
              !["connection", "content-length", "host"].includes(
                name.toLocaleLowerCase(),
              )
            ) {
              headers.set(
                name,
                Array.isArray(value) ? value.join(", ") : value,
              );
            }
          }
          const upstream = await fetch(new URL(path, getBackendUrl(path)), {
            method: request.method,
            headers,
            ...(requestBody.byteLength === 0 ? {} : { body: requestBody }),
          });
          const bytes = Buffer.from(await upstream.arrayBuffer());
          const contentType = upstream.headers.get("content-type") ?? "";
          let json;
          if (contentType.includes("application/json")) {
            try {
              json = JSON.parse(bytes.toString("utf8"));
            } catch {
              json = undefined;
            }
          }
          const call = {
            method: request.method ?? "GET",
            path,
            authorization: headers.get("authorization"),
            requestJson:
              requestBody.byteLength === 0
                ? undefined
                : JSON.parse(requestBody.toString("utf8")),
            status: upstream.status,
            json,
          };
          calls.push(call);
          if (shouldDisconnectResponse?.(call) === true) {
            response.statusCode = 502;
            response.setHeader("content-type", "text/plain; charset=utf-8");
            response.end(
              "The browser delivery disconnected after the upstream terminal.",
            );
            return;
          }
          response.statusCode = upstream.status;
          for (const [name, value] of upstream.headers) {
            if (
              ![
                "connection",
                "content-encoding",
                "content-length",
                "transfer-encoding",
              ].includes(name.toLocaleLowerCase())
            ) {
              response.setHeader(name, value);
            }
          }
          response.setHeader("content-length", String(bytes.byteLength));
          response.end(bytes);
        } catch (error) {
          response.statusCode = 502;
          response.setHeader("content-type", "text/plain; charset=utf-8");
          response.end(error instanceof Error ? error.message : String(error));
        }
      });
    },
  };
  const vite = await createViteServer({
    root: resolve(root, "apps/workbench"),
    configFile: false,
    appType: "spa",
    logLevel: "silent",
    plugins: [liveRouteProxy, react()],
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
        {
          find: /^@petra\/adapters$/u,
          replacement: resolve(
            root,
            "apps/workbench/test/wave5-browser-adapters-live.mjs",
          ),
        },
      ],
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort,
    },
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address !== null && typeof address === "object");
  return { vite, url: `http://127.0.0.1:${address.port}` };
};

export const startChrome = async ({
  headless = true,
  initialUrl = "about:blank",
  profilePrefix = "petra-wave4-browser-",
} = {}) => {
  assert.ok(existsSync(chromePath), `Chrome is unavailable at ${chromePath}.`);
  const profile = mkdtempSync(join(tmpdir(), profilePrefix));
  const child = spawn(
    chromePath,
    [
      ...(headless ? ["--headless=new"] : []),
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-first-run",
      initialUrl,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const activePortFile = join(profile, "DevToolsActivePort");
  let port;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Chrome exited before CDP was ready: ${stderr}`);
    }
    if (existsSync(activePortFile)) {
      port = Number(readFileSync(activePortFile, "utf8").split("\n")[0]);
      if (Number.isSafeInteger(port) && port > 0) break;
    }
    await wait(100);
  }
  assert.ok(port !== undefined, `Chrome CDP did not start: ${stderr}`);
  let pages;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      break;
    } catch {
      await wait(100);
    }
  }
  const page = pages?.find((entry) => entry.type === "page");
  assert.ok(page?.webSocketDebuggerUrl, "Chrome did not expose a CDP page.");
  return { child, profile, socketUrl: page.webSocketDebuggerUrl };
};

export const createCdp = async (socketUrl) => {
  const socket = new WebSocket(socketUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error === undefined) request.resolve(message.result);
    else request.reject(new Error(JSON.stringify(message.error)));
  });
  const send = (method, params = {}) =>
    new Promise((resolveSend, rejectSend) => {
      const id = ++sequence;
      pending.set(id, { resolve: resolveSend, reject: rejectSend });
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
  const until = async (expression, label = expression) => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await evaluate(expression)) return;
      await wait(100);
    }
    throw new Error(
      `Timed out waiting for ${label}:\n${await evaluate("document.body.innerText")}`,
    );
  };
  return { socket, send, evaluate, until };
};

const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const link = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

export const startCumulativeProductionBrowser = async ({
  root,
  getBackendUrl,
  scientificProjectId,
  writingProjectId,
  scientific,
  writing,
}) => {
  const calls = [];
  const consoleErrors = [];
  const workbench = await startWorkbench({ root, getBackendUrl, calls });
  progress(`workbench listening at ${workbench.url}`);
  const chrome = await startChrome();
  progress("isolated headless Chrome started");
  const cdp = await createCdp(chrome.socketUrl);
  progress("Chrome DevTools session attached");
  const { send, evaluate, until } = cdp;
  let initialBriefSnapshot;
  let closed = false;

  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.consoleAPICalled") {
      const type = message.params?.type;
      if (type === "error" || type === "assert") {
        consoleErrors.push(message.params.args?.map((arg) => arg.value));
      }
    }
    if (message.method === "Runtime.exceptionThrown") {
      consoleErrors.push(message.params?.exceptionDetails);
    }
  });

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

  const navigate = async (path, ready, label) => {
    const navigation = await send("Page.navigate", {
      url: new URL(path, workbench.url).href,
    });
    assert.equal(
      navigation.errorText,
      undefined,
      `Chrome could not navigate to ${path}: ${navigation.errorText}`,
    );
    try {
      await until(ready, label);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nMarkup: ${await evaluate("document.documentElement.outerHTML")}\nAPI calls: ${JSON.stringify(calls)}\nConsole: ${JSON.stringify(consoleErrors)}`,
        { cause: error },
      );
    }
    await evaluate("document.fonts.ready");
    progress(`${label} rendered`);
  };

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

  const latestCall = (predicate) => [...calls].reverse().find(predicate);

  const exerciseLifecycleState = async (expectedLifecycle) => {
    await navigate(
      `/projects/${scientificProjectId}/review/${scientific.session.review_session_id}`,
      'document.querySelector(".review-session") !== null',
      `live ${expectedLifecycle} Review lifecycle`,
    );
    const review = latestCall((call) =>
      call.path.endsWith(
        `/projects/${scientificProjectId}/reviews/${scientific.session.review_session_id}`,
      ),
    );
    assert.equal(review?.status, 200);
    assert.equal(review?.json?.content?.session?.lifecycle, expectedLifecycle);
    const text = await evaluate("document.body.innerText");
    if (expectedLifecycle === "deferred") {
      for (const value of [
        "This Review is deferred",
        "Reopen review",
        "Apply unavailable",
      ]) {
        assert.ok(text.includes(value), `Missing deferred meaning: ${value}`);
      }
      assert.equal(
        await evaluate(
          `${button("Prepare changes to apply")}.getAttribute("aria-disabled")`,
        ),
        "true",
      );
    }
  };

  const exerciseBeforeApply = async () => {
    const graphCallStart = calls.length;
    await navigate(
      `/projects/${scientificProjectId}/graph?layer=working`,
      'document.querySelector(".graph-surface") !== null',
      "live working Graph",
    );
    const overlay = latestCall((call) =>
      call.path.includes(`/${scientificProjectId}/relationship-overlay`),
    );
    assert.equal(overlay?.status, 200);
    assert.equal(overlay?.authorization, "Bearer petra-local-development");
    assert.equal(
      overlay?.json?.schema_name,
      "petra.project-relationship-overlay-view",
    );
    assert.equal(
      calls
        .slice(graphCallStart)
        .some((call) => call.path.includes("/relationship-view")),
      false,
      "The demonstrated Graph path used the legacy fallback route.",
    );
    const graphText = await evaluate("document.body.innerText");
    for (const text of [
      "Working — not authoritative",
      "Current authority",
      "The cumulative trace candidate retains an exact inspectable source passage.",
      "Labels and arrows carry relationship meaning",
    ]) {
      assert.ok(
        graphText.includes(text),
        `Missing live Graph meaning: ${text}`,
      );
    }
    const visualCounts = await evaluate(`({
      nodes: document.querySelectorAll(".graph-node").length,
      relationships: document.querySelectorAll(".graph-edge").length,
    })`);
    await evaluate(`${button("Text")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      'document.querySelector(".graph-text-view") !== null',
      "complete textual Graph peer",
    );
    assert.equal(
      await evaluate(`document.activeElement === ${button("Text")}`),
      true,
    );
    const textualCounts = await evaluate(`({
      nodes: document.querySelectorAll(".graph-text-view__nodes > li").length,
      relationships: document.querySelectorAll("section[aria-labelledby=graph-text-relationships-title] > ol > li").length,
    })`);
    assert.deepEqual(textualCounts, visualCounts);
    assert.equal(
      textualCounts.nodes,
      overlay.json.content.textual_peer.nodes.length,
    );
    assert.equal(
      textualCounts.relationships,
      overlay.json.content.textual_peer.relationships.length,
    );
    const textualBody = await evaluate("document.body.innerText");
    for (const text of [
      "Objects",
      "Relationships",
      "Meaning:",
      "Scope:",
      "Basis:",
    ]) {
      assert.ok(
        textualBody.includes(text),
        `Missing textual peer field: ${text}`,
      );
    }

    await navigate(
      `/projects/${scientificProjectId}/review/${scientific.session.review_session_id}`,
      'document.querySelectorAll(".review-member-selector").length === 2',
      "live ordinary and exception Review",
    );
    assert.deepEqual(
      await evaluate(
        '[...document.querySelectorAll(".review-member-selector > span")].map((element) => element.textContent.trim())',
      ),
      ["Member 1 · ordinary", "Member 2 · exception"],
    );
    const secondMember =
      'document.querySelectorAll(".review-member-selector")[1]';
    await evaluate(`${secondMember}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      `${secondMember}.getAttribute("aria-pressed") === "true"`,
      "exception Review member",
    );
    assert.equal(
      await evaluate(`document.activeElement === ${secondMember}`),
      true,
    );
    let reviewText = await evaluate("document.body.innerText");
    assert.ok(
      reviewText.includes(
        "The independent exception candidate remains rejected without affecting the selected candidate.",
      ),
    );
    assert.ok(reviewText.includes("rejected"));
    const firstMember =
      'document.querySelectorAll(".review-member-selector")[0]';
    await evaluate(`${firstMember}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      `${firstMember}.getAttribute("aria-pressed") === "true"`,
      "ordinary Review member",
    );
    assert.equal(
      await evaluate(`document.activeElement === ${firstMember}`),
      true,
    );

    const inspectSource = link("Inspect exact source");
    const sourceHref = await evaluate(`${inspectSource}.getAttribute("href")`);
    assert.ok(sourceHref.includes("basisId="));
    const basisId = await evaluate(
      `new URL(${inspectSource}.href).searchParams.get("basisId")`,
    );
    assert.ok(basisId);
    await evaluate(`${inspectSource}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      'document.querySelector(".reference-reader") !== null',
      "live exact source reader",
    );
    const sourceCall = latestCall((call) =>
      call.path.includes(
        `/projects/${scientificProjectId}/sources/${scientific.projectSource.project_source_id}`,
      ),
    );
    assert.equal(sourceCall?.status, 200);
    assert.equal(sourceCall?.authorization, "Bearer petra-local-development");
    await evaluate(`${link("Return to Review")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    const basisTargetId = `basis-${basisId}`;
    await until(
      `document.activeElement?.id === ${JSON.stringify(basisTargetId)}`,
      "returned Review basis focus",
    );
    assert.equal(await evaluate("window.location.hash"), `#${basisTargetId}`);

    await navigate(
      `/projects/${writingProjectId}/review/${writing.session.review_session_id}`,
      'document.querySelector(".review-session") !== null',
      "live controlled-writing Review",
    );
    const writingReview = latestCall((call) =>
      call.path.endsWith(
        `/projects/${writingProjectId}/reviews/${writing.session.review_session_id}`,
      ),
    );
    assert.equal(writingReview?.status, 200);
    assert.equal(writingReview?.json?.schema_version, "1.3.0");
    reviewText = await evaluate("document.body.innerText");
    for (const text of [
      "Commitment unavailable",
      "Preparation unavailable",
      "Apply unavailable",
      "No controlled-writing ChangeSet operation, Approval, or Apply path",
    ]) {
      assert.ok(reviewText.includes(text), `Missing writing boundary: ${text}`);
    }
    assert.equal(reviewText.includes("Prepare changes to apply"), false);

    await navigate(
      `/projects/${scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "live Brief before Apply",
    );
    const initialBrief = latestCall(
      (call) =>
        call.path === `/api/queries/projects/${scientificProjectId}/brief`,
    );
    assert.equal(initialBrief?.status, 200);
    initialBriefSnapshot = initialBrief.json.snapshot_hash;
    assert.ok(
      (
        await evaluate(
          'document.querySelector(".live-project-brief")?.textContent ?? ""',
        )
      ).includes(initialBriefSnapshot),
    );

    await navigate(
      `/projects/${scientificProjectId}/review/${scientific.session.review_session_id}`,
      `${button("Prepare changes to apply")} !== undefined`,
      "live Review manual checkpoint",
    );
  };

  const applyDisplayedChangeSet = async () => {
    const postCount = calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    ).length;
    await evaluate(`${button("Prepare changes to apply")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      'document.querySelector(".review-apply-preview") !== null',
      "prepared exact commitment",
    );
    assert.equal(
      await evaluate(
        'document.activeElement?.getAttribute("aria-label") === "Prepared commitment"',
      ),
      true,
    );
    assert.equal(
      calls.filter(
        (call) => call.method === "POST" && call.path.endsWith("/apply"),
      ).length,
      postCount,
      "Preparation sent a decision.",
    );
    const preparedText = await evaluate(
      'document.querySelector(".review-apply-preview").innerText',
    );
    for (const text of [
      "One complete atomic ChangeSet",
      "Complete atomic membership",
      "Every operation",
      "ReviewPolicy: not applicable",
      "Delegated and automatic Apply are unavailable",
    ]) {
      assert.ok(
        preparedText.includes(text),
        `Missing checkpoint text: ${text}`,
      );
    }

    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "forced-colors", value: "active" },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });
    await send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await evaluate('document.documentElement.style.fontSize = "200%"');
    await evaluate(
      "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
    );
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      true,
      "The prepared Review overflowed at 200% text in a 375px viewport.",
    );
    assert.notEqual(
      await evaluate(
        'getComputedStyle(document.querySelector(".review-validation")).borderTopStyle',
      ),
      "none",
    );
    assert.equal(
      await evaluate(
        'getComputedStyle(document.querySelector(".review-member-selector[aria-pressed=true]")).outlineStyle',
      ),
      "solid",
    );
    assert.ok(
      ["0s", "0.01ms", "0.00001s", "1e-05s"].includes(
        await evaluate(
          `getComputedStyle(${button("Apply displayed ChangeSet")}).transitionDuration`,
        ),
      ),
    );
    const nonColorText = await evaluate("document.body.innerText");
    for (const text of [
      "Candidate · working",
      "Current · authoritative",
      "Applicable checks passed",
      "Apply displayed ChangeSet",
    ]) {
      assert.ok(
        nonColorText.includes(text),
        `Meaning depended on color: ${text}`,
      );
    }
    await evaluate(
      `${button("Apply displayed ChangeSet")}.scrollIntoView({ block: "center", behavior: "instant" })`,
    );
    const rect = await evaluate(`(() => {
      const value = ${button("Apply displayed ChangeSet")}.getBoundingClientRect();
      return {
        x: value.left + value.width / 2,
        y: value.top + value.height / 2,
        height: value.height,
        left: value.left,
        right: value.right,
      };
    })()`);
    assert.ok(
      rect.height >= 44,
      "The Apply touch target is shorter than 44px.",
    );
    assert.ok(rect.left >= 0 && rect.right <= 375);
    await send("Input.synthesizeTapGesture", {
      x: rect.x,
      y: rect.y,
      duration: 100,
      gestureSourceType: "touch",
    });
    progress("touch Apply dispatched to the 200% Review checkpoint");
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (
        calls.filter(
          (call) => call.method === "POST" && call.path.endsWith("/apply"),
        ).length ===
        postCount + 1
      ) {
        break;
      }
      await wait(100);
    }
    assert.equal(
      calls.filter(
        (call) => call.method === "POST" && call.path.endsWith("/apply"),
      ).length,
      postCount + 1,
      "The touch action did not send exactly one Apply request.",
    );
    progress("the live server returned the exact touch Apply response");
    await until(
      'document.body.innerText.includes("The displayed ChangeSet applied")',
      "browser Apply result",
    );
    const applyCall = latestCall(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    );
    assert.equal(applyCall?.status, 200);
    assert.equal(applyCall?.authorization, "Bearer petra-local-development");
    assert.equal(
      applyCall?.requestJson?.schema_name,
      "petra.review-session-apply-request",
    );
    assert.equal(
      applyCall?.json?.schema_name,
      "petra.review-session-apply-result",
    );
    assert.equal(
      calls.filter(
        (call) => call.method === "POST" && call.path.endsWith("/apply"),
      ).length,
      postCount + 1,
    );
    const accessibility = await send("Accessibility.getFullAXTree");
    for (const label of [
      "Review members",
      "Current and Candidate",
      "Basis",
      "Consequences",
      "Decision",
    ]) {
      assert.ok(
        accessibility.nodes.some(
          (node) =>
            node.role?.value === "heading" && node.name?.value === label,
        ),
        `Missing accessibility heading: ${label}`,
      );
    }
    assert.ok(
      accessibility.nodes.some(
        (node) => node.role?.value === "term" && node.name?.value === "Origin",
      ),
      "The Origin definition term is absent from the accessibility tree.",
    );
    assert.ok(
      accessibility.nodes.some((node) => node.role?.value === "status"),
      "The confirmed Apply result is absent from the accessibility tree.",
    );
    return { request: applyCall.requestJson, result: applyCall.json };
  };

  const exerciseAfterApply = async () => {
    const resultText = await evaluate("document.body.innerText");
    for (const text of [
      "This does not mean every Review member applied",
      "Review outcome: applied",
      "Review outcome: rejected",
      "Application effect confirmed",
    ]) {
      assert.ok(resultText.includes(text), `Missing partial outcome: ${text}`);
    }
    assert.equal(
      calls.filter(
        (call) => call.method === "POST" && call.path.endsWith("/apply"),
      ).length,
      1,
      "The browser sent more than one Apply request.",
    );

    const briefCallCount = calls.filter(
      (call) =>
        call.path === `/api/queries/projects/${scientificProjectId}/brief`,
    ).length;
    await navigate(
      `/projects/${scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "live Brief after Apply",
    );
    await until(
      `window.location.pathname === ${JSON.stringify(`/projects/${scientificProjectId}/brief`)}`,
      "post-Apply Brief location",
    );
    assert.equal(
      calls.filter(
        (call) =>
          call.path === `/api/queries/projects/${scientificProjectId}/brief`,
      ).length,
      briefCallCount + 1,
    );
    const resultingBrief = latestCall(
      (call) =>
        call.path === `/api/queries/projects/${scientificProjectId}/brief`,
    );
    assert.equal(resultingBrief?.status, 200);
    assert.notEqual(resultingBrief.json.snapshot_hash, initialBriefSnapshot);
    const briefText = await evaluate("document.body.innerText");
    const completeBriefText = await evaluate(
      'document.querySelector(".live-project-brief")?.textContent ?? ""',
    );
    for (const text of [
      resultingBrief.json.snapshot_hash,
      "Technical History window and recovery boundaries",
    ]) {
      assert.ok(
        completeBriefText.includes(text),
        `Missing live Brief/History text: ${text}`,
      );
    }
    assert.ok(briefText.includes("Recent decisions"));
    const decisionSummaries =
      resultingBrief.json.content.recent_decisions.content.changes.map(
        (change) => change.observed_effect.summary,
      );
    assert.ok(decisionSummaries.length >= 3);
    assert.equal(
      await evaluate(
        'document.querySelectorAll("section[aria-labelledby=brief-decisions] > ol > li").length',
      ),
      decisionSummaries.length,
    );
    for (const summary of decisionSummaries) {
      assert.ok(
        briefText.includes(summary),
        `Missing canonical History summary: ${summary}`,
      );
    }
    assert.equal(
      calls.some((call) => call.path.includes("/history/recent")),
      false,
      "The Brief renderer made an unowned second History read.",
    );
    assert.deepEqual(consoleErrors, []);
  };

  const close = async () => {
    if (closed) return;
    closed = true;
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
      await workbench.vite.close();
      assert.ok(
        chrome.profile.startsWith(join(tmpdir(), "petra-wave4-browser-")),
      );
      rmSync(chrome.profile, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  };

  return {
    exerciseLifecycleState,
    exerciseBeforeApply,
    applyDisplayedChangeSet,
    exerciseAfterApply,
    close,
  };
};
