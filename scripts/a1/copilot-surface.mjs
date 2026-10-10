import assert from "node:assert/strict";
import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createCdp,
  startChrome,
} from "../../apps/workbench/test/cumulative-production-browser-driver.mjs";
import { repositoryRoot } from "../audit-frontend-a1.mjs";

export async function copilotSurface(pass) {
  const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
  const fixture = JSON.parse(
    await readFile(
      resolve(repositoryRoot, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
      "utf8",
    ),
  );
  const response = await fetch(
    `${origin}/api/projects/${fixture.project_id}/copilot`,
    { headers: { authorization: "Bearer petra-local-development" } },
  );
  assert.equal(response.status, 200);
  const retained = await response.json();
  assert.equal(retained.authorization.state, "ready");
  assert(retained.turns.length >= 2);
  assert(
    retained.turns.every((turn) => turn.question.startsWith("Synthetic A1")),
  );
  const chrome = await startChrome({
    profilePrefix: `petra-a1-hierarchy-${pass}-`,
  });
  const cdp = await createCdp(chrome.socketUrl);
  const errors = [],
    writes = [],
    observations = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
    if (
      message.method === "Network.requestWillBeSent" &&
      message.params.request.url.startsWith(`${origin}/api/`) &&
      message.params.request.method !== "GET"
    )
      writes.push({
        method: message.params.request.method,
        url: message.params.request.url,
      });
  });
  await Promise.all([
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
    cdp.send("Network.enable"),
  ]);
  const until = async (expression, label) => {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (await cdp.evaluate(expression)) return;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error(
      `Did not reach ${label}: ${await cdp.evaluate("document.body.innerText.slice(-2000)")}`,
    );
  };
  const resize = async (width, height) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.evaluate(
      "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
  };
  await resize(1440, 1000);
  await cdp.send("Page.navigate", {
    url: `${origin}/projects/${fixture.project_id}/brief`,
  });
  await until(
    "document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready' && document.querySelector('.copilot-message--assistant')!==null",
    "retained live conversation",
  );
  const geometry = () =>
    cdp.evaluate(`(() => {
    const box=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),display:s.display};};
    return {viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},agent:box('#project-agent'),workspace:box('#project-workspace'),transcript:box('.copilot-transcript'),composer:box('.copilot-compose-area'),input:box('#copilot-question'),heading:box('.reference-agent-heading'),object:box('.reference-project-main h1, .copilot-workspace-result h2')};
  })()`);
  const key = async (value, code, virtualKey) => {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: value,
      code,
      windowsVirtualKeyCode: virtualKey,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: value,
      code,
      windowsVirtualKeyCode: virtualKey,
    });
  };
  const close = async () => {
    try {
      assert.deepEqual(errors, []);
      assert.deepEqual(
        writes,
        [],
        "Hierarchy inspection must not invoke a model or domain command.",
      );
      assert.equal(
        observations.length,
        3,
        "Only three successful criterion observations can produce this artifact.",
      );
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const base = `reports/FE-A1-COPILOT-HIERARCHY-${pass.toUpperCase()}`;
      await writeFile(
        resolve(repositoryRoot, `${base}.png`),
        Buffer.from(screenshot.data, "base64"),
      );
      await writeFile(
        resolve(repositoryRoot, `${base}.json`),
        JSON.stringify(
          {
            status: "passed",
            pass,
            verified_at: new Date().toISOString(),
            project_id: fixture.project_id,
            observations,
            browser_errors: errors,
            command_requests: writes,
            screenshot: `${base}.png`,
            boundary:
              "Live production layout, retained actual managed-model Q/A, navigation, composer, disclosure and Workspace presentation only. No new model call, proposal command, examiner or cycle completion is inferred.",
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      cdp.socket.close();
      if (chrome.child.exitCode === null) {
        const stopped = new Promise((done) => chrome.child.once("exit", done));
        chrome.child.kill("SIGTERM");
        await stopped;
      }
      await rm(chrome.profile, { recursive: true, force: true });
    }
  };
  return {
    ...cdp,
    retained,
    projectId: fixture.project_id,
    until,
    resize,
    geometry,
    key,
    observations,
    close,
  };
}
