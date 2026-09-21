import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const stablePort = 4311;
const stableUrl = `http://127.0.0.1:${stablePort}`;
const preferenceKey = "petra.shell.preferences.v1";
const unrelatedDraftKey = "petra.wave6.personal-settings.draft";

const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const groupButton = (label) =>
  `[...document.querySelectorAll(".settings-group-nav button")].find((element) => element.querySelector("strong")?.textContent.trim() === ${JSON.stringify(label)})`;
const labelledControl = (label) =>
  `(()=>{const candidate=[...document.querySelectorAll("label")].find((element)=>element.querySelector("strong")?.textContent.trim()===${JSON.stringify(label)}||element.textContent.trim()===${JSON.stringify(label)});return candidate?.querySelector("input");})()`;

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

const closeBrowser = async ({ browser }) => {
  if (browser === undefined) return;
  const { workbench, chrome, cdp } = browser;
  try {
    if (cdp.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
        wait(2_000),
      ]);
    }
  } finally {
    cdp.socket.close();
    if (chrome.child.exitCode === null) chrome.child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) =>
        chrome.child.addListener("close", resolveExit),
      ),
      wait(5_000),
    ]);
    if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
    assert.ok(
      chrome.profile.startsWith(join(tmpdir(), "petra-wave6-settings-")),
    );
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
    await workbench.vite.close();
  }
};

const readJson = async (url, token) => {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200, `Could not read ${url}.`);
  return response.json();
};

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = resolve(
    root,
    process.env.PETRA_WAVE6_PERSONAL_SETTINGS_OUTPUT ??
      "reports/WAVE6-PERSONAL-SETTINGS-BROWSER.json",
  );
  const calls = [];
  const consoleFailures = [];
  let browser;
  let observation;
  let observerFailure;
  let closed = false;

  const readReviewSelection = async (context, reviewSessionId) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${context.scientificProjectId}/reviews/${reviewSessionId}`,
        context.backendUrl,
      ),
      { headers: { authorization: `Bearer ${context.token}` } },
    );
    assert.equal(response.status, 200);
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.ok(session && selected);
    return {
      project_id: context.scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    };
  };

  const prepareAndApply = async (context, reviewSessionId, beforeApply) => {
    const client = new ReviewSessionApplyClient({
      baseUrl: context.backendUrl,
      token: context.token,
    });
    const checkpoint = await client.prepare(
      await readReviewSelection(context, reviewSessionId),
    );
    await beforeApply?.();
    const request = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint,
      decided_at: new Date().toISOString(),
    };
    return { request, result: await client.apply(request) };
  };

  const runBrowser = async (context) => {
    const projectPath = `/api/queries/projects/${context.scientificProjectId}/shell`;
    const workPath = `/api/queries/projects/${context.scientificProjectId}/work/${context.publishedItem49.workUnitId}`;
    const [projectBefore, workBefore] = await Promise.all([
      readJson(new URL(projectPath, context.backendUrl), context.token),
      readJson(new URL(workPath, context.backendUrl), context.token),
    ]);
    const workbench = await startWorkbench({
      root,
      getBackendUrl: () => context.backendUrl,
      calls,
      port: stablePort,
      strictPort: true,
    });
    assert.equal(workbench.url, stableUrl);
    const chrome = await startChrome({
      profilePrefix: "petra-wave6-settings-",
    });
    const cdp = await createCdp(chrome.socketUrl);
    browser = { workbench, chrome, cdp };
    const { send, evaluate, until } = cdp;

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
    const focus = async (expression, label) => {
      await until(`(${expression}) != null`, label);
      await evaluate(`(${expression}).focus()`);
      assert.equal(
        await evaluate(`document.activeElement === (${expression})`),
        true,
        `${label} did not receive focus.`,
      );
    };
    const activate = async (expression, label, keyKind = "enter") => {
      await focus(expression, label);
      if (keyKind === "space") await key(" ", "Space", 32, " ");
      else await key("Enter", "Enter", 13, "\r");
    };
    const stored = () =>
      evaluate(
        `JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)}))`,
      );
    const settingsPath = `/settings?project=${encodeURIComponent(context.scientificProjectId)}`;
    const navigate = await send("Page.navigate", {
      url: new URL(settingsPath, workbench.url).href,
    });
    assert.equal(navigate.errorText, undefined);
    await until(
      'document.querySelector(".settings-preference-panel") !== null && document.querySelector("#project-controls-title") !== null',
      "production Settings route",
    );
    await evaluate("document.fonts.ready");
    await evaluate(
      `localStorage.setItem(${JSON.stringify(unrelatedDraftKey)}, JSON.stringify({draft:"retain me",selection:[3,8],work:"${context.publishedItem49.workUnitId}"}))`,
    );
    const initialProjectLabel = await evaluate(
      'document.querySelector(".settings-project .settings-readonly dd")?.textContent',
    );
    assert.ok(initialProjectLabel?.length > 0);

    await activate(
      labelledControl("Petra Graphite"),
      "Graphite theme",
      "space",
    );
    await until(
      'document.querySelector(".settings-surface")?.dataset.petraTheme === "graphite" && document.querySelector(".reference-app")?.dataset.petraTheme === "graphite"',
      "immediate graphite theme",
    );

    await activate(groupButton("Layout"), "Layout settings");
    await activate(button("Focus"), "Focus layout preset");
    await until(
      'document.querySelector(".settings-surface")?.dataset.layoutPreset === "focus"',
      "immediate Focus layout",
    );

    await activate(groupButton("Editor"), "Editor settings");
    const fontSize = labelledControl("Code text size");
    await focus(fontSize, "Code text size");
    await key("End", "End", 35);
    await key("ArrowLeft", "ArrowLeft", 37);
    await until(
      'document.querySelector(".settings-code-preview") !== null && getComputedStyle(document.querySelector(".settings-code-preview")).fontSize === "19px"',
      "immediate editor text size",
    );
    await activate(
      labelledControl("Code ligatures"),
      "Code ligatures",
      "space",
    );
    assert.equal((await stored()).editorLigatures, true);

    await activate(groupButton("Accessibility"), "Accessibility settings");
    await activate(
      labelledControl("Reduce interface motion"),
      "Reduce interface motion",
      "space",
    );
    await until(
      'document.querySelector(".reference-app")?.dataset.petraReducedMotion === "true"',
      "immediate reduced motion",
    );
    const retainedBeforeReload = await stored();
    assert.deepEqual(
      {
        theme: retainedBeforeReload.theme,
        preset: retainedBeforeReload.activePreset,
        fontSize: retainedBeforeReload.editorFontSize,
        ligatures: retainedBeforeReload.editorLigatures,
        reducedMotion: retainedBeforeReload.reducedMotion,
      },
      {
        theme: "graphite",
        preset: "focus",
        fontSize: 19,
        ligatures: true,
        reducedMotion: true,
      },
    );

    await evaluate('document.body.dataset.wave6BeforeReload = "true"');
    await send("Page.reload");
    await until(
      'document.body.dataset.wave6BeforeReload === undefined && document.querySelector(".settings-surface")?.dataset.petraTheme === "graphite" && document.querySelector(".settings-surface")?.dataset.layoutPreset === "focus" && document.querySelector(".settings-preference-feedback")?.dataset.persistence === "saved_on_device" && document.querySelector(".settings-project .settings-readonly dd") != null',
      "retained preferences after reload",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".settings-project .settings-readonly dd")?.textContent',
      ),
      initialProjectLabel,
    );

    await activate(groupButton("Editor"), "Editor settings after reload");
    await activate(button("Reset code text size"), "exact text-size reset");
    await until(
      `JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)})).editorFontSize === 14 && ${button("Undo reset")} != null`,
      "exact scoped reset and undo availability",
    );
    const exactReset = await stored();
    assert.equal(exactReset.editorLigatures, true);
    assert.equal(exactReset.theme, "graphite");
    assert.equal(exactReset.activePreset, "focus");
    assert.equal(exactReset.reducedMotion, true);
    await activate(button("Undo reset"), "undo exact reset");
    await until(
      `JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)})).editorFontSize === 19`,
      "restored exact text size",
    );
    await activate(button("Reset Editor"), "Editor group reset");
    await until(
      `JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)})).editorFontSize === 14 && JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)})).editorLigatures === false`,
      "Editor group reset",
    );
    const groupReset = await stored();
    assert.equal(groupReset.theme, "graphite");
    assert.equal(groupReset.activePreset, "focus");
    assert.equal(groupReset.reducedMotion, true);

    await evaluate(`(() => {
      window.__petraOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === ${JSON.stringify(preferenceKey)}) throw new Error("blocked preference write");
        return window.__petraOriginalSetItem.call(this, key, value);
      };
    })()`);
    await activate(groupButton("Appearance"), "Appearance settings");
    await activate(labelledControl("High Contrast"), "High Contrast", "space");
    await until(
      'document.querySelector(".settings-preference-feedback")?.dataset.persistence === "session_only" && document.querySelector(".settings-surface")?.dataset.petraTheme === "contrast" && document.querySelector(".reference-app")?.dataset.petraTheme === "contrast"',
      "session-only retained preference",
    );
    assert.equal((await stored()).theme, "graphite");
    await evaluate(
      "Storage.prototype.setItem = window.__petraOriginalSetItem; delete window.__petraOriginalSetItem",
    );
    await activate(button("Retry saving"), "retry device save");
    await until(
      `document.querySelector(".settings-preference-feedback")?.dataset.persistence === "saved_on_device" && JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)})).theme === "contrast"`,
      "successful persistence retry",
    );

    await evaluate(`(() => {
      const value = JSON.parse(localStorage.getItem(${JSON.stringify(preferenceKey)}));
      value.layout.map = 999;
      localStorage.setItem(${JSON.stringify(preferenceKey)}, JSON.stringify(value));
    })()`);
    await evaluate('document.body.dataset.wave6BeforeRepairReload = "true"');
    await send("Page.reload");
    await until(
      'document.body.dataset.wave6BeforeRepairReload === undefined && document.querySelector(".settings-preference-feedback")?.dataset.persistence === "repair_required" && document.querySelector(".settings-preference-feedback")?.textContent.includes("layout · panels.map")',
      "invalid stored field recovery",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".settings-surface")?.dataset.petraTheme',
      ),
      "contrast",
    );
    await activate(groupButton("Layout"), "Layout recovery settings");
    await activate(button("Reset panel widths"), "repair panel widths");
    await until(
      'document.querySelector(".settings-preference-feedback")?.dataset.persistence === "saved_on_device"',
      "repaired saved preferences",
    );

    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await until(
      'getComputedStyle(document.querySelector(".settings-personal-layout")).gridTemplateColumns.split(" ").length === 1',
      "narrow Settings reflow",
    );
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= document.documentElement.clientWidth",
      ),
      true,
      "Settings overflowed the narrow viewport.",
    );
    const touchTargets = await evaluate(
      '[...document.querySelectorAll(".settings-group-nav button, .settings-preference-actions button, .settings-preference-panel label")].map((element) => element.getBoundingClientRect().height)',
    );
    assert.ok(
      touchTargets.length > 0 && touchTargets.every((height) => height >= 44),
    );
    await focus(groupButton("Editor"), "responsive Editor group control");
    await key("Tab", "Tab", 9);
    assert.equal(
      await evaluate("document.activeElement?.matches(':focus-visible')"),
      true,
      "Keyboard focus was not visibly exposed.",
    );
    const accessibility = await send("Accessibility.getFullAXTree");
    for (const name of [
      "Personal setting groups",
      "Appearance",
      "Layout",
      "Editor",
      "Accessibility",
      "Reset panel widths",
      "Reset all personal settings",
    ]) {
      assert.ok(
        accessibility.nodes.some(
          (node) =>
            typeof node.name?.value === "string" &&
            node.name.value.trim() === name,
        ),
        `${name} is missing from the accessibility tree.`,
      );
    }
    assert.equal(
      await evaluate(
        `localStorage.getItem(${JSON.stringify(unrelatedDraftKey)})`,
      ),
      JSON.stringify({
        draft: "retain me",
        selection: [3, 8],
        work: context.publishedItem49.workUnitId,
      }),
    );

    const [projectAfter, workAfter] = await Promise.all([
      readJson(new URL(projectPath, context.backendUrl), context.token),
      readJson(new URL(workPath, context.backendUrl), context.token),
    ]);
    const projectIdentity = (view) => ({
      project_id: view.project_id,
      project_revision: view.content.project.revision,
      project_definition_id: view.content.definition.project_definition_id,
      project_definition_revision: view.content.definition.revision,
      project_definition_hash: view.content.definition.content_hash,
    });
    const workIdentity = (view) => ({
      project_id: view.project_id,
      work_unit_ref: view.content.summary.work_unit_ref,
      execution_state: view.content.summary.execution.state,
      terminal_outcome: view.content.summary.execution.terminal_outcome,
    });
    assert.deepEqual(
      projectIdentity(projectAfter),
      projectIdentity(projectBefore),
    );
    assert.deepEqual(workIdentity(workAfter), workIdentity(workBefore));
    assert.ok(
      calls.every((call) => call.method === "GET"),
      "Personal settings issued a server mutation.",
    );
    assert.deepEqual(consoleFailures, []);

    return {
      browser: {
        product: browserVersion.product,
        user_agent: browserVersion.userAgent,
        protocol_version: browserVersion.protocolVersion,
      },
      stable_url: `${stableUrl}${settingsPath}`,
      project: {
        ...projectIdentity(projectAfter),
        composed_view_hash_before: projectBefore.content_hash,
        composed_view_hash_after: projectAfter.content_hash,
      },
      work: {
        ...workIdentity(workAfter),
        composed_view_hash_before: workBefore.content_hash,
        composed_view_hash_after: workAfter.content_hash,
      },
      personal_preferences: {
        changed_groups: ["appearance", "layout", "editor", "accessibility"],
        reload_retained: true,
        exact_control_reset: "editor.fontSize",
        group_reset: "editor",
        reset_undo_executed: true,
        unrelated_preferences_preserved: true,
        session_only_failure_visible: true,
        persistence_retry_succeeded: true,
        invalid_field_recovery: "layout.panels.map",
        unrelated_draft_preserved: true,
      },
      responsive_keyboard: {
        widths_executed: [1280, 390],
        keyboard_controls_used: true,
        visible_focus: true,
        accessibility_tree_checked: true,
        minimum_touch_target_pixels: Math.min(...touchTargets),
        horizontal_overflow: false,
      },
      requests: calls.map((call) => ({
        method: call.method,
        path: call.path,
        status: call.status,
      })),
    };
  };

  const record = async (stage, context) => {
    try {
      if (stage === "projection_lag") {
        return prepareAndApply(context, context.scientificReviewSessionId);
      }
      if (stage === "governed_command_failure") {
        return prepareAndApply(
          context,
          context.failureReviewSessionId,
          context.advanceAuthority,
        );
      }
      if (stage === "restart_complete") {
        observation = await runBrowser(context);
      }
      return undefined;
    } catch (error) {
      observerFailure = error;
      throw error;
    }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    let failure = observerFailure;
    try {
      await closeBrowser({ browser });
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.ok(
        observation,
        "The personal Settings workflow was not recorded.",
      );
      writeFileSync(
        output,
        `${JSON.stringify(
          {
            schema_name: "petra.wave6-personal-settings-browser-evidence",
            schema_version: "1.0.0",
            status: "passed",
            executed_at: new Date().toISOString(),
            command:
              "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:personal-settings-ui",
            operation_ids: [
              "settings.personal-change",
              "settings.personal-reset",
            ],
            environment: {
              stable_url: observation.stable_url,
              browser: observation.browser,
              transport:
                "production React Router and authenticated Petra HTTP reads through the stable Vite proxy",
              persistence:
                "browser device-local preference record plus fresh disposable PostgreSQL Project and Work authority",
            },
            observation,
            boundary:
              "One isolated Chromium session used the production /settings route at the stable Petra URL with an exact PostgreSQL-backed Project target. Keyboard interaction changed all four personal preference groups, observed immediate app presentation, reloaded retained values, reset one exact control and one group without changing unrelated preferences, undid an exact reset, recovered a blocked device write through the visible session-only retry, repaired one invalid stored field without discarding valid values, and repeated the surface at 390 CSS pixels with visible keyboard focus, browser semantics, responsive reflow, and 44-pixel targets. The unchanged exact Project and durable Work identities, unrelated draft record, route context, and absence of server mutation prove the personal-device authority boundary; composed read hashes are retained separately because current projection presentation may advance independently. No fixture route or developer-only product instruction substituted for the workflow.",
            limitations: [
              "This focused operation artifact does not claim any outstanding named evidence-plan scenario.",
              "The stable URL is retained for this isolated execution and stops when the command completes; final long-lived user acceptance remains separate.",
            ],
          },
          null,
          2,
        )}\n`,
      );
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
