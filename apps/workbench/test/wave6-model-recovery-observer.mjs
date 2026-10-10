import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startPetraServer } from "@petra/server";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";
import { createWave4EvidenceObserver as createActualModelObserver } from "../../../scripts/wave6-actual-model-ui-observer.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const link = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const certifiedModel = {
  id: "gpt-5.6-terra",
  model: "gpt-5.6-terra",
  displayName: "GPT-5.6-Terra",
  hidden: false,
  isDefault: false,
  defaultReasoningEffort: "medium",
  supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
  inputModalities: ["text", "image"],
  supportsPersonality: false,
};

const createFailingCertifiedProvider = () => {
  const listeners = new Set();
  let accountReads = 0;
  let threadAttempts = 0;
  return {
    diagnostics: () => ({
      providerKind: "codex_app_server",
      initialized: true,
      transport: "stdio_jsonl",
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      pendingRequests: 0,
      pendingServerRequests: 0,
      scientificExtractionEligible: false,
    }),
    readAccount: () => {
      accountReads += 1;
      return Promise.resolve({
        authenticated: true,
        authMode: "chatgpt",
        planType: "prolite",
        requiresOpenaiAuth: true,
      });
    },
    listModels: () => Promise.resolve([certifiedModel]),
    startManagedLogin: () =>
      Promise.reject(new Error("Managed login is outside this recovery run.")),
    cancelManagedLogin: () => Promise.resolve(),
    startThread: () => {
      threadAttempts += 1;
      return Promise.reject(
        new Error(
          "Certified provider unavailable by deliberate Wave 6 recovery injection.",
        ),
      );
    },
    startTurn: () =>
      Promise.reject(
        new Error("The failed provider must not receive a model turn."),
      ),
    interruptTurn: () => Promise.resolve(),
    resolveApproval: () => Promise.resolve(),
    onEvent: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => Promise.resolve(),
    observations: () => ({ accountReads, threadAttempts }),
  };
};

const closeBrowser = async ({ cdp, chrome, workbench }) => {
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
          join(tmpdir(), "petra-wave6-model-recovery-"),
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

const exerciseModelRecovery = async (context) => {
  const provider = createFailingCertifiedProvider();
  const workStarts = [];
  const terminal = {
    startWork: (request) => {
      workStarts.push(structuredClone(request));
      return Promise.resolve({
        work_unit_id: request.interaction.work_unit_id,
        work_unit_revision: 1,
        work_unit_spec_hash:
          "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        state: "running",
        started_at: request.interaction.started_at,
      });
    },
    persist: () =>
      Promise.reject(
        new Error("A failed provider must not persist a grounded response."),
      ),
  };
  const recoveryServer = await startPetraServer({
    port: 0,
    authToken: context.token,
    codexProvider: provider,
    codexWorkspaceRoot: context.root,
    codexGroundedSynthesis: { timeoutMs: 5_000 },
    groundedSynthesisTerminal: terminal,
  });
  const calls = [];
  let disconnectInitialFailure = true;
  let workbench;
  let chrome;
  let cdp;
  try {
    workbench = await startWorkbench({
      root: context.root,
      getBackendUrl: (path) =>
        path.startsWith("/api/interactions/")
          ? recoveryServer.url
          : context.backendUrl,
      calls,
      shouldDisconnectResponse: (call) => {
        if (
          disconnectInitialFailure &&
          call.method === "POST" &&
          call.path === "/api/interactions/run"
        ) {
          disconnectInitialFailure = false;
          return true;
        }
        return false;
      },
    });
    chrome = await startChrome({
      profilePrefix: "petra-wave6-model-recovery-",
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

    const returnPath = `/projects/${context.scientificProjectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2`;
    const url = new URL(
      `/projects/${encodeURIComponent(context.scientificProjectId)}/petra?return_to=${encodeURIComponent(returnPath)}&return_label=Work`,
      workbench.url,
    ).href;
    const navigate = await send("Page.navigate", { url });
    assert.equal(navigate.errorText, undefined);
    await until(
      'document.querySelector(".petra-model-readiness[data-readiness=ready]") !== null && document.querySelector(".petra-composer textarea") !== null',
      "ready certified Petra composer for recovery",
    );
    await evaluate("document.fonts.ready");

    const changedDraft = `${context.registeredPrompt}\n\nKeep this local note through recovery.`;
    await evaluate(`(() => {
      const textarea = document.querySelector(".petra-composer textarea");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, ${JSON.stringify(changedDraft)});
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".petra-composer textarea").value === ${JSON.stringify(changedDraft)}`,
      "edited local model draft",
    );
    await wait(100);
    await send("Page.reload");
    await wait(250);
    await until(
      `document.querySelector(".petra-composer textarea")?.value === ${JSON.stringify(changedDraft)}`,
      "draft retained across route reload",
    );
    const retainedContextText = await evaluate(
      'document.querySelector(".petra-model-readiness").textContent',
    );
    assert.ok(
      retainedContextText.includes(
        context.readiness.readiness.context.binding.context_packet_ref
          .record_id,
      ),
    );
    assert.ok(
      retainedContextText.includes(
        context.readiness.readiness.context.binding.evidence_packet_ref
          .record_id,
      ),
    );
    await evaluate(`${button("Restore registered question")}.click()`);
    await until(
      `document.querySelector(".petra-composer textarea").value === ${JSON.stringify(context.registeredPrompt)}`,
      "restored exact registered prompt",
    );

    await evaluate(`${button("Ask Petra")}.click()`);
    await until(
      'document.querySelector(".petra-model-response")?.dataset.resultState === "failed"',
      "automatic retained-response replay after interrupted delivery",
    );
    const transportText = await evaluate("document.body.innerText");
    assert.equal(
      transportText.includes("Response delivery was not confirmed"),
      false,
      "a verified replay must replace the uncertain delivery notice",
    );
    await evaluate(`(() => {
      const textarea = document.querySelector(".petra-composer textarea");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, ${JSON.stringify(changedDraft)});
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".petra-composer textarea").value === ${JSON.stringify(changedDraft)}`,
      "edited draft retained after disconnected delivery",
    );
    await wait(100);
    const storedBeforeReload = await evaluate(`({
      draft: sessionStorage.getItem(${JSON.stringify(`petra.model-draft.${context.scientificProjectId}`)}),
      identity: JSON.parse(sessionStorage.getItem(${JSON.stringify(`petra.model-run.${context.scientificProjectId}`)})),
    })`);
    assert.equal(storedBeforeReload.draft, changedDraft);
    assert.match(
      storedBeforeReload.identity.threadId,
      /^thread_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
    assert.match(
      storedBeforeReload.identity.runId,
      /^run_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
    assert.match(
      storedBeforeReload.identity.connectionId,
      /^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
    assert.equal(workStarts.length, 1);

    const originatingNavigation = await send("Page.navigate", {
      url: new URL(returnPath, workbench.url).href,
    });
    assert.equal(originatingNavigation.errorText, undefined);
    await until(
      `${link("Discuss this task with Petra")} !== undefined`,
      "originating Work control for retained Petra run",
    );
    const originatingHref = await evaluate(
      `${link("Discuss this task with Petra")}.getAttribute("href")`,
    );
    const originatingDestination = new URL(originatingHref, workbench.url);
    assert.equal(
      originatingDestination.pathname,
      `/projects/${context.scientificProjectId}/petra`,
    );
    assert.equal(
      originatingDestination.searchParams.get("return_to"),
      returnPath,
    );
    assert.equal(
      originatingDestination.searchParams.get("return_label"),
      "Work task",
    );
    assert.equal(
      originatingDestination.searchParams.get("return_focus"),
      "work-control-boundary",
    );
    await evaluate(`${link("Discuss this task with Petra")}.click()`);
    await until(
      `window.location.pathname === ${JSON.stringify(`/projects/${context.scientificProjectId}/petra`)} && document.querySelector(".petra-focus .reference-context-back") !== null && document.querySelector(".petra-model-response")?.dataset.resultState === "failed" && document.querySelector(".petra-composer textarea")?.value === ${JSON.stringify(changedDraft)}`,
      "retained run opened from its originating Work control",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".petra-focus .reference-context-back").getAttribute("href")',
      ),
      `${returnPath}#work-control-boundary`,
    );
    assert.equal(
      await evaluate(`${button("Reconnect and replay")} === undefined`),
      true,
    );
    const failureText = await evaluate(
      'document.querySelector(".petra-model-response").textContent',
    );
    assert.ok(
      failureText.includes(
        "Certified provider unavailable by deliberate Wave 6 recovery injection.",
      ),
      `The confirmed provider failure was not presented honestly: ${failureText}`,
    );
    assert.ok(
      failureText.includes("Cancellable grounded work registered"),
      `The replay omitted the retained Work stage: ${failureText}`,
    );
    assert.equal(
      await evaluate(
        `${button("Try in a new run")}.getAttribute("aria-disabled")`,
      ),
      "true",
    );
    assert.ok(
      (await evaluate("document.body.innerText")).includes(
        "Restore the exact registered Project question before starting another run.",
      ),
    );
    await evaluate(`${button("Restore registered question")}.click()`);
    await until(
      `${button("Try in a new run")}.getAttribute("aria-disabled") !== "true" && document.querySelector(".petra-composer textarea").value === ${JSON.stringify(context.registeredPrompt)}`,
      "honest new-run prerequisite recovery",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".petra-focus .reference-context-back").getAttribute("href")',
      ),
      `${returnPath}#work-control-boundary`,
    );

    const run = recoveryServer.runtime.snapshot(
      storedBeforeReload.identity.runId,
    );
    assert.equal(run.status, "failed");
    assert.equal(run.threadId, storedBeforeReload.identity.threadId);
    assert.equal(run.workUnitId, workStarts[0].interaction.work_unit_id);
    const providerObservations = provider.observations();
    assert.equal(providerObservations.threadAttempts, 1);
    assert.equal(workStarts.length, 1);
    const interactionPosts = calls.filter(
      (call) => call.method === "POST" && call.path === "/api/interactions/run",
    );
    const replayGets = calls.filter(
      (call) =>
        call.method === "GET" &&
        call.path.startsWith(
          `/api/interactions/${storedBeforeReload.identity.runId}?`,
        ),
    );
    assert.equal(interactionPosts.length, 1);
    assert.equal(replayGets.length, 2);
    const submitted = JSON.stringify(interactionPosts[0].requestJson);
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

    const observation = {
      scenario: "UX1.6-MODEL/failure-reconnect-draft-preservation",
      url,
      boundary: {
        surface: "production React Petra route and composer",
        readiness_source: "live Project model-readiness query",
        failure_source:
          "production certified grounded-synthesis runtime with a deterministic unavailable-provider port",
        disconnect_source:
          "browser proxy replaced only the initial response with a 502 transport failure after the runtime reached its failed terminal",
        persistence_limit:
          "the adverse runtime retains replay and Work identity in-process; the separate actual-provider trace owns PostgreSQL provider-success evidence",
      },
      draft: {
        edited_value: changedDraft,
        retained_across_reload: true,
        restored_registered_prompt: context.registeredPrompt,
        retained_through_disconnect_and_replay: storedBeforeReload.draft,
        restored_after_confirmed_failure_for_new_run: context.registeredPrompt,
      },
      context: {
        project_id: context.scientificProjectId,
        context_packet_id:
          context.readiness.readiness.context.binding.context_packet_ref
            .record_id,
        evidence_packet_id:
          context.readiness.readiness.context.binding.evidence_packet_ref
            .record_id,
        snapshot_id:
          context.readiness.readiness.context.binding.snapshot_ref.snapshot_id,
        role_certification_id:
          context.readiness.readiness.role.certification_ref
            .role_certification_id,
      },
      retained_identity: {
        ...storedBeforeReload.identity,
        work_unit_id: workStarts[0].interaction.work_unit_id,
        runtime_status_after_replay: run.status,
      },
      initial_delivery: {
        state: "unconfirmed",
        automatic_replay_verified_failure: true,
        uncertain_notice_cleared: true,
      },
      originating_control: {
        label: "Discuss this task with Petra",
        source: returnPath,
        destination: originatingDestination.href,
        exact_task_return: `${returnPath}#work-control-boundary`,
        retained_draft_and_run: true,
      },
      replay: {
        state: "failed",
        automatic_on_interrupted_delivery_and_reopen: true,
        message: failureText.replaceAll(/\s+/gu, " ").trim(),
        new_run_control_after_confirmed_failure: true,
        new_run_requires_registered_prompt: true,
      },
      api: {
        interaction_posts: interactionPosts.length,
        replay_gets: replayGets.length,
        provider_thread_attempts: providerObservations.threadAttempts,
        work_starts: workStarts.length,
        submitted_exact_context: true,
        duplicate_provider_effect: false,
      },
      return_destination: `${returnPath}#work-control-boundary`,
    };
    const output =
      process.env.PETRA_WAVE6_MODEL_RECOVERY_BROWSER_OUTPUT?.trim();
    if (output !== undefined && output !== "") {
      writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`);
    }
    return observation;
  } finally {
    await Promise.all([
      closeBrowser({ cdp, chrome, workbench }),
      recoveryServer.shutdown(),
    ]);
  }
};

export const createWave4EvidenceObserver = async ({ root }) => {
  const actualModelObserver = await createActualModelObserver({ root });
  let recoveryObservation;
  let closed = false;
  return {
    record: async (stage, context) => {
      assert.equal(stage, "actual_model_ui");
      recoveryObservation = await exerciseModelRecovery({ root, ...context });
      const actual = await actualModelObserver.record(stage, context);
      return { ...actual, recovery: recoveryObservation };
    },
    close: async () => {
      if (closed) return;
      closed = true;
      await actualModelObserver.close();
    },
    get recoveryObservation() {
      return recoveryObservation;
    },
  };
};
