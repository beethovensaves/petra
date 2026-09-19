import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "../apps/workbench/test/cumulative-production-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

export const createWave4EvidenceObserver = async ({ root }) => {
  let workbench;
  let chrome;
  let cdp;
  let observation;
  let closed = false;

  const record = async (stage, context) => {
    assert.equal(
      stage,
      "actual_model_ui",
      `Unsupported Wave 6 actual-model observer stage: ${stage}`,
    );
    const calls = [];
    workbench = await startWorkbench({
      root,
      getBackendUrl: () => context.backendUrl,
      calls,
    });
    chrome = await startChrome({
      profilePrefix: "petra-wave6-actual-model-",
    });
    cdp = await createCdp(chrome.socketUrl);
    const { send, evaluate, until } = cdp;
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

    const url = new URL(
      `/projects/${encodeURIComponent(context.scientificProjectId)}/petra?return_to=${encodeURIComponent(`/projects/${context.scientificProjectId}/brief`)}&return_label=Brief`,
      workbench.url,
    ).href;
    const navigation = await send("Page.navigate", { url });
    assert.equal(
      navigation.errorText,
      undefined,
      `Chrome could not open the production Petra route: ${navigation.errorText}`,
    );
    await until(
      'document.querySelector(".petra-model-readiness[data-readiness=ready]") !== null && document.querySelector(".petra-composer textarea") !== null',
      "ready certified Petra composer",
    );
    await evaluate("document.fonts.ready");

    const readinessText = await evaluate(
      'document.querySelector(".petra-model-readiness").textContent',
    );
    const prompt = await evaluate(
      'document.querySelector(".petra-composer textarea").value',
    );
    assert.equal(prompt, context.registeredPrompt);
    for (const required of [
      "Certified model role",
      "Grounded synthesist",
      "Ready",
      "Provider",
      "Project context",
      "No authority effect",
      "Model identity and exact context",
      context.readiness.readiness.role.certification_ref.role_certification_id,
      context.readiness.readiness.context.binding.context_packet_ref.record_id,
      context.readiness.readiness.context.binding.evidence_packet_ref.record_id,
    ]) {
      assert.ok(
        readinessText.includes(required),
        `The production readiness presentation omitted ${required}.`,
      );
    }
    await evaluate(`${button("Ask Petra")}.click()`);

    let resultState;
    for (let attempt = 0; attempt < 1_800; attempt += 1) {
      resultState = await evaluate(
        'document.querySelector(".petra-model-response")?.dataset.resultState',
      );
      if (resultState === "completed" || resultState === "failed") break;
      await wait(100);
    }
    assert.equal(
      resultState,
      "completed",
      `The production React model path did not complete: ${await evaluate("document.body.innerText")}`,
    );

    const responseText = await evaluate(
      'document.querySelector(".petra-model-response").textContent',
    );
    const answer = await evaluate(
      'document.querySelector(".petra-model-response__answer").textContent',
    );
    const progress = await evaluate(
      '[...document.querySelectorAll(".petra-model-progress li")].map((element) => element.textContent.trim())',
    );
    const origins = await evaluate(
      '[...document.querySelectorAll("#petra-model-origin-title + p + ul li")].map((element) => element.textContent.trim())',
    );
    const references = await evaluate(`(() => {
      const section = document.querySelector("#petra-model-references-title")?.parentElement;
      return Object.fromEntries(
        [...(section?.querySelectorAll("dl > div") ?? [])].map((item) => [
          item.querySelector("dt")?.textContent.trim(),
          item.querySelector("dd")?.textContent.trim(),
        ]),
      );
    })()`);
    const limitations = await evaluate(
      '[...document.querySelectorAll(".petra-model-limitations li")].map((element) => element.textContent.trim())',
    );
    const workDestination = await evaluate(
      'document.querySelector("#petra-model-effects-title + p a")?.getAttribute("href")',
    );
    const reviewEffect = await evaluate(
      'document.querySelector("#petra-model-effects-title")?.parentElement?.textContent',
    );
    const returnDestination = await evaluate(
      'document.querySelector(".petra-model-return a")?.getAttribute("href")',
    );
    const post = calls.find(
      (call) => call.method === "POST" && call.path === "/api/interactions/run",
    );
    assert.equal(post?.status, 200);
    assert.equal(post?.authorization, `Bearer ${context.token}`);
    const submitted = JSON.stringify(post?.requestJson);
    assert.ok(submitted.includes(context.registeredPrompt));
    assert.ok(
      submitted.includes(
        context.readiness.readiness.context.binding.context_packet_ref
          .record_id,
      ),
    );
    assert.ok(
      submitted.includes(
        context.readiness.readiness.context.binding.evidence_packet_ref
          .record_id,
      ),
    );
    for (const required of [
      "Grounded answer",
      "Response progress",
      "Origin and force",
      "Advisory model output",
      "no Project authority effect",
      "Provider",
      "Exact references",
      "Work and Review effects",
      "No Review request was returned",
    ]) {
      assert.ok(
        responseText.includes(required),
        `The production response presentation omitted ${required}.`,
      );
    }
    assert.ok(answer.length > 0, "The provider returned no visible answer.");
    assert.ok(progress.length >= 7, "The response progress was incomplete.");
    assert.ok(origins.length > 0, "The statement origins were omitted.");
    assert.equal(
      references["Context packet"],
      context.readiness.readiness.context.binding.context_packet_ref.record_id,
    );
    assert.equal(
      references["Evidence packet"],
      context.readiness.readiness.context.binding.evidence_packet_ref.record_id,
    );
    assert.equal(
      references["Model deployment"],
      context.readiness.readiness.role.deployment.model_deployment_id,
    );
    assert.equal(
      references["Role certification"],
      context.readiness.readiness.role.certification_ref.role_certification_id,
    );
    assert.equal(
      references.Snapshot,
      context.readiness.readiness.context.binding.snapshot_ref.snapshot_id,
    );
    assert.ok(
      references["Grounded response"]?.startsWith("grounded_response_"),
    );
    assert.ok(workDestination?.includes("/work/work_unit_"));
    assert.ok(reviewEffect.includes("No Review request was returned"));
    assert.equal(
      returnDestination,
      `/projects/${context.scientificProjectId}/brief`,
    );
    assert.deepEqual(limitations, [...context.readiness.limitations]);

    observation = {
      scenario: "UX1.6-MODEL/actual-certified-model-ui-path",
      url,
      prompt,
      readiness: readinessText.replaceAll(/\s+/gu, " ").trim(),
      answer,
      progress,
      origins,
      limitations,
      references,
      work_destination: workDestination,
      review_effect: "No Review request was returned",
      return_destination: returnDestination,
      execution_source: "Provider",
      authority_effect: "No authority effect",
      context_packet_id: references["Context packet"],
      evidence_packet_id: references["Evidence packet"],
      grounded_response_id: references["Grounded response"],
      model_deployment_id: references["Model deployment"],
      role_certification_id: references["Role certification"],
      snapshot_id: references.Snapshot,
      api: {
        readiness_reads: calls.filter((call) =>
          call.path.endsWith("/model-readiness"),
        ).length,
        interaction_posts: calls.filter(
          (call) =>
            call.method === "POST" && call.path === "/api/interactions/run",
        ).length,
        submitted_exact_context: true,
      },
    };
    const output = process.env.PETRA_WAVE6_ACTUAL_MODEL_BROWSER_OUTPUT?.trim();
    if (output !== undefined && output !== "")
      writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`);
    return observation;
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      if (cdp?.socket.readyState === WebSocket.OPEN) {
        await Promise.race([
          cdp.send("Browser.close").catch(() => undefined),
          wait(2_000),
        ]);
      }
    } finally {
      cdp?.socket.close();
      if (chrome?.child.exitCode === null) {
        chrome.child.kill("SIGTERM");
        await Promise.race([
          new Promise((resolveExit) =>
            chrome.child.addListener("close", resolveExit),
          ),
          wait(5_000),
        ]);
      }
      if (chrome?.child.exitCode === null) chrome.child.kill("SIGKILL");
      await workbench?.vite.close();
      if (chrome !== undefined) {
        assert.ok(
          chrome.profile.startsWith(
            join(tmpdir(), "petra-wave6-actual-model-"),
          ),
        );
        rmSync(chrome.profile, {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 100,
        });
      }
    }
  };

  return {
    record,
    close,
    get observation() {
      return observation;
    },
  };
};
