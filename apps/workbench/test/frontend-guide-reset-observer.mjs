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

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll("button")].find((item) => item.textContent.trim() === ${JSON.stringify(label)})`;

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = resolve(
    root,
    process.env.PETRA_FRONTEND_GUIDE_RESET_OUTPUT ??
      "reports/FRONTEND-GUIDE-RESET-BROWSER.json",
  );
  const calls = [];
  let workbench;
  let chrome;
  let cdp;
  let observation;
  let failure;

  const prepareAndApply = async (context, reviewSessionId, beforeApply) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${context.scientificProjectId}/reviews/${reviewSessionId}`,
        context.backendUrl,
      ),
      { headers: { authorization: `Bearer ${context.token}` } },
    );
    assert.equal(response.status, 200);
    const review = await response.json();
    const session = review.content.session;
    const selected = review.content.members[0];
    assert.ok(session && selected);
    const client = new ReviewSessionApplyClient({
      baseUrl: context.backendUrl,
      token: context.token,
    });
    const checkpoint = await client.prepare({
      project_id: context.scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    });
    await beforeApply?.();
    const request = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint,
      decided_at: new Date().toISOString(),
    };
    return { request, result: await client.apply(request) };
  };

  const run = async (context) => {
    workbench = await startWorkbench({
      root,
      getBackendUrl: () => context.backendUrl,
      calls,
    });
    chrome = await startChrome({ profilePrefix: "petra-fe-a1-guide-reset-" });
    cdp = await createCdp(chrome.socketUrl);
    const { send, evaluate, until } = cdp;
    await Promise.all([send("Page.enable"), send("Runtime.enable")]);
    const navigate = async (path, ready, label) => {
      const response = await send("Page.navigate", {
        url: new URL(path, workbench.url).href,
      });
      assert.equal(response.errorText, undefined);
      await until(ready, label);
    };
    const setField = async (label, value) =>
      evaluate(`(() => {
        const field = [...document.querySelectorAll("label.petra-field")].find((item) => item.querySelector(".petra-field__label")?.textContent.startsWith(${JSON.stringify(label)}))?.querySelector("input, textarea");
        if (!field) throw new Error("Missing ${label} field");
        const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, ${JSON.stringify(value)});
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);

    await navigate(
      `/settings?project=${encodeURIComponent(context.scientificProjectId)}`,
      'document.querySelector(".settings-project") !== null',
      "ordinary Settings",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".settings-project-reset") === null',
      ),
      true,
      "The acceptance reset must be absent from ordinary Settings.",
    );

    await navigate(
      `/guide?project=${encodeURIComponent(context.scientificProjectId)}`,
      'document.querySelector(".settings-project-reset") !== null',
      "direct acceptance guide reset",
    );
    await evaluate(`${button("Choose replacement profile")}.click()`);
    await until(
      'document.querySelector(".settings-project-reset form") !== null',
      "replacement form",
    );
    await evaluate(
      'document.querySelector(\'[data-family="petra.controlled-writing"] input[name="project-profile"]\').click()',
    );
    const name = "FE-A1 guide reset replacement";
    await setField("Replacement Project name", name);
    await setField(
      "Replacement focus",
      "Prepare a controlled explanation with exact authority sources.",
    );
    await evaluate(
      'document.querySelector(".project-profile-command__confirmation input").click()',
    );
    await until(
      `${button("Archive and create replacement")}?.getAttribute("aria-disabled") !== "true"`,
      "eligible additive test reset",
    );
    await evaluate(`${button("Archive and create replacement")}.click()`);
    await until(
      `window.location.pathname.startsWith("/projects/") && window.location.pathname.endsWith("/brief") && document.body.innerText.includes(${JSON.stringify(name)})`,
      "replacement Project outcome",
    );
    const reset = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path ===
          `/api/commands/projects/${context.scientificProjectId}/reset`,
    );
    assert.equal(reset?.status, 200);
    assert.equal(
      reset?.json?.destination?.project_id !== context.scientificProjectId,
      true,
    );
    observation = {
      schema_name: "petra.frontend-guide-reset-browser",
      schema_version: "1.0.0",
      status: "passed",
      recorded_at: new Date().toISOString(),
      original_project_id: context.scientificProjectId,
      replacement_project_id: reset.json.destination.project_id,
      ordinary_settings_reset_absent: true,
      direct_guide_reset_executed: true,
      reset_command_status: reset.status,
      final_path: await evaluate("window.location.pathname"),
    };
    writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`);
  };

  return {
    record: async (stage, context) => {
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
        if (stage === "restart_complete") await run(context);
      } catch (error) {
        failure = error;
        throw error;
      }
      return undefined;
    },
    close: async () => {
      try {
        if (cdp?.socket.readyState === WebSocket.OPEN) {
          await Promise.race([
            cdp.send("Browser.close").catch(() => undefined),
            wait(2_000),
          ]);
        }
      } finally {
        cdp?.socket.close();
        if (chrome?.child.exitCode === null) chrome.child.kill("SIGTERM");
        if (chrome !== undefined) {
          await Promise.race([
            new Promise((resolveExit) =>
              chrome.child.addListener("close", resolveExit),
            ),
            wait(5_000),
          ]);
          if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
          assert.ok(
            chrome.profile.startsWith(
              join(tmpdir(), "petra-fe-a1-guide-reset-"),
            ),
          );
          rmSync(chrome.profile, { recursive: true, force: true });
        }
        await workbench?.vite.close();
      }
      if (failure !== undefined) throw failure;
    },
  };
};
