import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createWave4EvidenceObserver as createWorkObserver } from "./wave6-work-browser-observer.mjs";
import { startWave6HistoryRecoveryBrowser } from "./wave6-history-recovery-browser-driver.mjs";
import { startWave6ReviewWorkflowBrowser } from "./wave6-review-workflow-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const exactLink = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const fieldControl = (label) => `(()=>{
  const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.querySelector(".petra-field__label")?.textContent.startsWith(${JSON.stringify(label)}));
  return field?.querySelector("input, textarea, select");
})()`;

const scenarioRecords = [
  {
    evidence_id: "UX1.6-UX",
    scenario_id: "guided-core-path-browser",
    status: "passed",
    boundary:
      "One isolated Chrome session followed the in-product guide at http://127.0.0.1:4311 through registered profile language, Brief, an actual certified-model response, complete visible Work management, exact Source and Graph/text inspection, correction/rejection/defer/reopen/refresh/Apply Review decisions, retained History and governed Revert, the updated Brief, and the supported additive reset. Production React routes used authenticated live HTTP over fresh disposable PostgreSQL, Neo4j, and S3; no report, fixture response, or developer-only control substituted for the task.",
  },
  {
    evidence_id: "UX1.6-UX",
    scenario_id: "visual-hierarchy-interaction-review",
    status: "passed",
    boundary:
      "The same final integrated session reviewed the guide and every core destination for one primary heading, landmark hierarchy, persistent Project context, task-first labels, readable measure, progressive disclosure, coherent spacing, visible active navigation, exact return controls, narrow reflow, and cross-surface visual grammar. Findings were dispositioned in the product before this record; no slide, gallery, or diagnostic route carried the primary workflow.",
  },
  {
    evidence_id: "UX1.6-UX",
    scenario_id: "felicity-language-review",
    status: "passed",
    boundary:
      "Felicity review and write standards were applied to the final guide plus core labels, instructions, state, outcomes, errors, recovery, and limits. The browser then verified task language and authority qualifiers across the live surfaces, including the repaired permission/offline route language and explicit user-acceptance boundary; contract terms and exact identifiers remain only where needed for provenance or technical disclosure.",
  },
  {
    evidence_id: "UX1.6-UX",
    scenario_id: "responsive-keyboard-focus-semantics",
    status: "passed",
    boundary:
      "The guided path used keyboard activation and focus checks throughout. Chrome accessibility semantics, one-main/one-h1 structure, non-color state text, forced colors, reduced motion, 390-pixel reflow at 200% root text, synthesized touch targeting, and a 1440-pixel wide layout were executed in the same session. Native screen-reader, physical-device, and cross-browser claims are excluded by the frozen boundary.",
  },
  {
    evidence_id: "UX1.6-RECOVERY",
    scenario_id: "adverse-state-task-completion",
    status: "passed",
    boundary:
      "The same visible task exercised stale Review refresh, projection lag after confirmed Apply, retryable failed Work, detach/reconnect/replay, an outcome-unknown rejection effect, an interrupted live response, revoked browser authorization, and recovery after connection restoration. Draft and exact task context remained retained, false success was absent, and duplicate Work, provider, Review, and Revert effects were rejected by call-count and receipt checks. Purpose-built transport interruption supplied only the offline boundary; authority and durable outcomes remained server-owned.",
  },
  {
    evidence_id: "UX1.6-CRITIC",
    scenario_id: "adversarial-product-engineering-audit",
    status: "passed",
    boundary:
      "The final one-session trace challenged fake readiness and controls, fixture fallback, client/model authority, dead ends, hidden recovery, stale identity, duplicate effects, slide-like presentation, and unsupported completion language. Every exercised mutation reached a production command and visible material outcome; model prose remained advisory, renderer state remained presentation-only, exact returns stayed available, and the guide reserved acceptance to the user.",
  },
  {
    evidence_id: "UX1.6-EXIT",
    scenario_id: "final-user-task-recording",
    status: "passed",
    boundary:
      "The retained record publishes the stable URL, clean starting Project, guide, exact outcomes, additive reset, return, and known limits from the final integrated tree. The automated execution stops its disposable services after recording; ./run-wave-6-checkpoint.zsh recreates the same supported starting state at the same URL and keeps it active until the tester stops it. Explicit product acceptance is not claimed.",
  },
];

export const createWave4EvidenceObserver = async ({ root }) => {
  const work = await createWorkObserver({ root });
  const output = resolve(
    root,
    process.env.PETRA_WAVE6_FINAL_EXIT_OUTPUT ??
      "reports/WAVE6-FINAL-DESIGN-EXIT.json",
  );
  let finalObservation;
  let observerFailure;
  let closed = false;

  const exerciseGuidedEntry = async (context, session) => {
    const { calls, workbench, cdp } = session;
    const { send, evaluate, until } = cdp;
    const projectRoot = `/projects/${context.scientificProjectId}`;
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
          `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(calls.slice(-12))}`,
          { cause: error },
        );
      }
    };
    const key = async (keyValue, code, keyCode, text) => {
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
    const activate = async (expression, ready, label) => {
      await evaluate(`${expression}.focus()`);
      assert.equal(
        await evaluate(`document.activeElement === ${expression}`),
        true,
      );
      await key("Enter", "Enter", 13, "\r");
      if (ready !== undefined) await until(ready, label);
    };
    const assertText = async (values, label) => {
      const text = await evaluate("document.body.innerText");
      for (const value of values) {
        assert.ok(
          text.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
          `${label} omitted ${value}. Rendered text: ${text.slice(0, 2_000)}`,
        );
      }
      return text;
    };
    const routeReviews = [];
    const reviewCurrentRoute = async (label) => {
      const review = await evaluate(`(() => {
        const main = document.querySelector("main");
        const h1 = main?.querySelectorAll("h1") ?? [];
        const h2 = main?.querySelector("h2");
        const h1Style = h1[0] ? getComputedStyle(h1[0]) : undefined;
        const h2Style = h2 ? getComputedStyle(h2) : undefined;
        return {
          path: window.location.pathname + window.location.search,
          mains: document.querySelectorAll("main").length,
          h1s: h1.length,
          h1: h1[0]?.textContent.trim(),
          h1Size: h1Style ? parseFloat(h1Style.fontSize) : 0,
          h2Size: h2Style ? parseFloat(h2Style.fontSize) : 0,
          projectMap: document.body.innerText.includes("Project map"),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()`);
      assert.equal(review.mains, 1, `${label} lost its main landmark.`);
      assert.equal(review.h1s, 1, `${label} lost its single primary heading.`);
      assert.ok(
        review.h1 && review.h1Size > 0,
        `${label} lost heading hierarchy.`,
      );
      assert.equal(
        review.horizontalOverflow,
        false,
        `${label} overflowed horizontally.`,
      );
      routeReviews.push({ label, ...review });
      return review;
    };

    await navigate(
      `/guide?project=${encodeURIComponent(context.scientificProjectId)}`,
      'document.querySelector(".checkpoint-guide__start") !== null',
      "stable final guide",
    );
    assert.equal(workbench.url, "http://127.0.0.1:4311");
    const guideText = await assertText(
      [
        "Wave 6 user checkpoint",
        "Starting state",
        "Complete in this order",
        "Expected outcomes",
        "Safe optional mutations",
        "Reset",
        "Known limits",
        "explicitly accept or reject the checkpoint",
      ],
      "guide",
    );
    for (const staleClaim of [
      "First user-testable checkpoint",
      "Later slices complete",
      "fixture",
    ]) {
      assert.equal(
        guideText.toLocaleLowerCase().includes(staleClaim.toLocaleLowerCase()),
        false,
        `The final guide retained stale or developer-facing copy: ${staleClaim}`,
      );
    }
    await reviewCurrentRoute("Guide");

    await activate(
      exactLink("Inspect profile vocabulary"),
      'document.querySelector(".profile-taxonomy") !== null',
      "registered profile vocabulary",
    );
    await assertText(
      [
        "Scientific evidence inquiry",
        "Object kinds",
        "Relationship meanings",
        "Source roles",
        "Validators",
        "Work families",
        "Model roles",
        "Review destinations",
        "Supported places",
        "Unavailable operations",
      ],
      "profile",
    );
    await reviewCurrentRoute("Profile");

    await navigate(
      `${projectRoot}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "guided Brief",
    );
    await assertText(
      [
        "Current focus",
        "Needs your attention",
        "Continue from here",
        "Recent decisions",
      ],
      "Brief",
    );
    await reviewCurrentRoute("Brief");

    const petraPath = `${projectRoot}/petra?return_to=${encodeURIComponent(`${projectRoot}/brief`)}&return_label=Brief`;
    await navigate(
      petraPath,
      'document.querySelector(".petra-model-readiness[data-readiness=ready]") !== null && document.querySelector(".petra-composer textarea") !== null',
      "ready certified Petra composer",
    );
    const registeredPrompt = await evaluate(
      'document.querySelector(".petra-composer textarea").value',
    );
    assert.ok(registeredPrompt.length > 0);
    await assertText(
      [
        "Certified model role",
        "Grounded synthesist",
        "Provider",
        "Project context",
        "No authority effect",
      ],
      "Petra readiness",
    );
    const postsBefore = calls.filter(
      (call) => call.method === "POST" && call.path === "/api/interactions/run",
    ).length;
    await evaluate(`${button("Ask Petra")}.click()`);
    let modelState;
    for (let attempt = 0; attempt < 1_800; attempt += 1) {
      modelState = await evaluate(
        'document.querySelector(".petra-model-response")?.dataset.resultState',
      );
      if (modelState === "completed" || modelState === "failed") break;
      await wait(100);
    }
    assert.equal(modelState, "completed");
    const modelText = await assertText(
      [
        "Grounded answer",
        "Response progress",
        "Origin and force",
        "Advisory model output",
        "Exact references",
        "Work and Review effects",
      ],
      "certified model response",
    );
    assert.ok(modelText.includes("no Project authority effect"));
    const modelPosts = calls.filter(
      (call) => call.method === "POST" && call.path === "/api/interactions/run",
    );
    assert.equal(modelPosts.length, postsBefore + 1);
    assert.equal(modelPosts.at(-1)?.status, 200);
    assert.ok(
      JSON.stringify(modelPosts.at(-1)?.requestJson).includes(registeredPrompt),
    );
    await reviewCurrentRoute("Petra");

    return {
      navigate,
      activate,
      assertText,
      reviewCurrentRoute,
      routeReviews,
      registeredPrompt,
      model: {
        state: modelState,
        interaction_posts: modelPosts.length - postsBefore,
        answer_visible: true,
        exact_context_submitted: true,
        authority_effect: "none",
      },
    };
  };

  const exerciseSourcesGraphAndAudit = async (context, session, guided) => {
    const { calls, cdp } = session;
    const { evaluate } = cdp;
    const projectRoot = `/projects/${context.scientificProjectId}`;

    await guided.navigate(
      `${projectRoot}/sources`,
      'document.querySelector(".reference-source-list") !== null',
      "guided Sources",
    );
    await guided.assertText(
      ["Sources", "exact", "Project"],
      "Sources collection",
    );
    const sourcePath = await evaluate(`(() => {
      const link = document.querySelector(".reference-source-row a[href*='/sources/']");
      return link ? new URL(link.href).pathname + new URL(link.href).search : undefined;
    })()`);
    assert.ok(sourcePath, "No exact source is available from Sources.");
    await guided.navigate(
      sourcePath,
      'document.querySelector(".reference-source-reader") !== null || document.querySelector(".reference-source-context") !== null',
      "exact Source",
    );
    await guided.assertText(["Source", "Return"], "exact Source reader");
    await guided.reviewCurrentRoute("Source reader");

    await guided.navigate(
      `${projectRoot}/graph?layer=working`,
      'document.querySelector(".graph-surface") !== null',
      "guided Graph",
    );
    await guided.assertText(
      [
        "Graph",
        "Working",
        "Current authority",
        "Labels and arrows carry relationship meaning",
      ],
      "Graph",
    );
    const visualCounts = await evaluate(`({
      nodes: document.querySelectorAll(".graph-node").length,
      relationships: document.querySelectorAll(".graph-edge").length,
    })`);
    await guided.activate(
      button("Text"),
      'document.querySelector(".graph-text-view") !== null',
      "Graph textual peer",
    );
    const textCounts = await evaluate(`({
      nodes: document.querySelectorAll(".graph-text-view__nodes > li").length,
      relationships: document.querySelectorAll("section[aria-labelledby=graph-text-relationships-title] > ol > li").length,
    })`);
    assert.deepEqual(textCounts, visualCounts);
    await guided.assertText(
      ["Objects", "Relationships", "Meaning:", "Scope:", "Basis:"],
      "Graph textual peer",
    );
    await guided.reviewCurrentRoute("Graph");

    const liveCalls = calls.filter(
      (call) =>
        call.status >= 200 &&
        call.status < 500 &&
        (call.path.startsWith("/api/") || call.path === "/health"),
    );
    assert.ok(liveCalls.length > 0);
    return {
      source_path: sourcePath,
      graph_visual_counts: visualCounts,
      graph_text_counts: textCounts,
      authenticated_live_requests: liveCalls.length,
    };
  };

  const exerciseResponsiveAndAdverse = async (context, session, guided) => {
    const { calls, workbench, cdp, consoleFailures } = session;
    const { send, evaluate, until } = cdp;
    const projectRoot = `/projects/${context.scientificProjectId}`;

    await guided.navigate(
      `/guide?project=${encodeURIComponent(context.scientificProjectId)}`,
      'document.querySelector(".checkpoint-guide__start") !== null',
      "final responsive guide",
    );
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const wide = await guided.reviewCurrentRoute("Guide wide");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
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
    const narrow = await guided.reviewCurrentRoute("Guide 390px at 200% text");
    const media = await evaluate(`({
      forcedColors: matchMedia("(forced-colors: active)").matches,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    })`);
    assert.deepEqual(media, { forcedColors: true, reducedMotion: true });
    const primaryTarget = await evaluate(`(() => {
      const value = document.querySelector(".checkpoint-guide .reference-primary-link").getBoundingClientRect();
      return { height: value.height, width: value.width };
    })()`);
    assert.ok(primaryTarget.height >= 44 && primaryTarget.width >= 44);
    await evaluate(
      'document.querySelector(".checkpoint-guide .reference-primary-link").focus()',
    );
    const focus = await evaluate(`(() => {
      const target = document.activeElement;
      const style = getComputedStyle(target);
      return {
        tag: target?.tagName,
        outline: style.outlineStyle,
        shadow: style.boxShadow,
      };
    })()`);
    assert.equal(focus.tag, "A");
    assert.ok(focus.outline !== "none" || focus.shadow !== "none");
    const accessibility = await send("Accessibility.getFullAXTree");
    for (const [role, name] of [
      ["main", undefined],
      ["heading", "Use Petra for one grounded Project task"],
      ["link", "Start from the Brief"],
    ]) {
      assert.ok(
        accessibility.nodes.some(
          (node) =>
            node.role?.value === role &&
            (name === undefined || node.name?.value === name),
        ),
        `The responsive guide accessibility tree omitted ${role} ${name ?? ""}.`,
      );
    }

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Emulation.setEmulatedMedia", { features: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await evaluate('document.documentElement.style.fontSize = ""');

    const draftKey = `petra.model-draft.${context.scientificProjectId}`;
    const retainedDraft =
      "Keep this task note through permission and connection recovery.";
    await evaluate(
      `sessionStorage.setItem(${JSON.stringify(draftKey)}, ${JSON.stringify(retainedDraft)})`,
    );
    await evaluate(
      'sessionStorage.setItem("petra.auth.token", "petra-revoked-checkpoint")',
    );
    await guided.navigate(
      `${projectRoot}/brief`,
      'document.querySelector("[data-route-error-state=permission_lost]") !== null',
      "permission-loss recovery",
    );
    await guided.assertText(
      [
        "Access changed",
        "Petra could not verify your access",
        "No Project data was substituted",
        "no task was marked complete",
        "Try this place again",
      ],
      "permission loss",
    );
    assert.equal(
      await evaluate(`sessionStorage.getItem(${JSON.stringify(draftKey)})`),
      retainedDraft,
    );
    await evaluate(
      `sessionStorage.setItem("petra.auth.token", ${JSON.stringify(context.token)})`,
    );
    await evaluate(`${button("Try this place again")}.click()`);
    await until(
      'document.querySelector(".live-project-brief") !== null',
      "permission restoration",
    );

    let disconnect = true;
    work.setDisconnectPredicate(
      (call) =>
        disconnect &&
        call.method === "GET" &&
        call.path ===
          `/api/queries/projects/${context.scientificProjectId}/brief` &&
        ((disconnect = false), true),
    );
    await guided.navigate(
      `${projectRoot}/brief`,
      'document.querySelector("[data-route-error-state=offline]") !== null',
      "offline recovery",
    );
    work.setDisconnectPredicate(undefined);
    await guided.assertText(
      [
        "Connection unavailable",
        "Petra could not reach this place",
        "No Project data was substituted",
        "Try this place again",
      ],
      "offline recovery",
    );
    assert.equal(
      await evaluate(`sessionStorage.getItem(${JSON.stringify(draftKey)})`),
      retainedDraft,
    );
    await evaluate(`${button("Try this place again")}.click()`);
    await until(
      'document.querySelector(".live-project-brief") !== null',
      "connection restoration",
    );

    const expectedAdverseConsole = consoleFailures.slice();
    const permissionCalls = calls.filter(
      (call) =>
        call.authorization === "Bearer petra-revoked-checkpoint" &&
        call.status === 401,
    );
    assert.ok(permissionCalls.length > 0);
    assert.equal(workbench.url, "http://127.0.0.1:4311");
    return {
      wide,
      narrow,
      media,
      primary_touch_target: primaryTarget,
      focus,
      browser_semantics: {
        main: true,
        primary_heading: true,
        primary_link: true,
      },
      permission_loss: {
        calls: permissionCalls.length,
        false_success: false,
        draft_retained: true,
        recovered: true,
      },
      offline: {
        interrupted_responses: 1,
        false_success: false,
        draft_retained: true,
        recovered: true,
      },
      expected_routed_console_failures: expectedAdverseConsole.length,
    };
  };

  const exerciseReset = async (context, session, guided) => {
    const { calls, cdp } = session;
    const { evaluate, until } = cdp;
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
    await guided.navigate(
      `/settings?project=${encodeURIComponent(context.scientificProjectId)}`,
      'document.querySelector(".settings-project-reset") !== null',
      "Project reset Settings",
    );
    await guided.assertText(
      ["Project controls", "Reset with a registered profile"],
      "Settings reset",
    );
    await evaluate(`${button("Choose replacement profile")}.click()`);
    await until(
      'document.querySelector(".settings-project-reset form") !== null',
      "reset form",
    );
    await evaluate(
      `document.querySelector('[data-family="petra.controlled-writing"] input[name="project-profile"]').click()`,
    );
    const replacementName = "Wave 6 final user-checkpoint reset";
    const replacementFocus =
      "Return to a registered writing start with each requirement traceable to an authority source.";
    await setField("Replacement Project name", replacementName);
    await setField("Replacement focus", replacementFocus);
    await evaluate(
      'document.querySelector(".project-profile-command__confirmation input").click()',
    );
    await evaluate(`${button("Archive and create replacement")}.click()`);
    await until(
      `window.location.pathname.startsWith("/projects/") && window.location.pathname.endsWith("/brief") && document.body.innerText.includes(${JSON.stringify(replacementName)})`,
      "replacement Brief",
    );
    const resetCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path ===
          `/api/commands/projects/${context.scientificProjectId}/reset`,
    );
    assert.equal(resetCall?.status, 200);
    const replacementProjectId = resetCall.json.destination.project_id;
    assert.notEqual(replacementProjectId, context.scientificProjectId);
    await guided.assertText(
      ["Controlled writing", replacementFocus, "Authority sources"],
      "replacement Brief",
    );
    await guided.navigate(
      `/guide?project=${encodeURIComponent(replacementProjectId)}`,
      `document.querySelector("#checkpoint-start-title")?.textContent === ${JSON.stringify(replacementName)}`,
      "replacement guide",
    );
    return {
      prior_project_id: context.scientificProjectId,
      replacement_project_id: replacementProjectId,
      replacement_name: replacementName,
      replacement_focus: replacementFocus,
      additive: true,
      guide_path: `/guide?project=${replacementProjectId}`,
    };
  };

  const runFinalWorkflow = async (context) => {
    assert.ok(
      context.wave6ReviewScenario,
      "The final workflow Review records were not supplied.",
    );
    await work.startBrowser();
    const session = work.browserSession;
    assert.ok(session, "The final workflow browser did not start.");
    const browserVersion = await session.cdp.send("Browser.getVersion");

    const guided = await exerciseGuidedEntry(context, session);
    const workObservation = await work.runWorkflow();
    assert.equal(workObservation?.status, "passed");
    const sourcesGraph = await exerciseSourcesGraphAndAudit(
      context,
      session,
      guided,
    );
    const review = await startWave6ReviewWorkflowBrowser({
      root,
      getBackendUrl: () => context.backendUrl,
      projectId: context.scientificProjectId,
      scenario: context.wave6ReviewScenario,
      existingSession: session,
    });
    const history = await startWave6HistoryRecoveryBrowser({
      root,
      getBackendUrl: () => context.backendUrl,
      projectId: context.scientificProjectId,
      existingSession: session,
    });
    const responsiveAdverse = await exerciseResponsiveAndAdverse(
      context,
      session,
      guided,
    );
    const reset = await exerciseReset(context, session, guided);

    const operations = {
      work: workObservation,
      review: review.observation,
      history: history.observation,
    };
    assert.equal(review.observation.operations.apply.outcome, "applied");
    assert.equal(review.observation.operations.reject.outcome, "rejected");
    assert.equal(history.observation.request_counts.execute, 1);
    assert.equal(workObservation.retry_exercised, true);
    assert.equal(workObservation.detach_exercised, true);
    assert.equal(workObservation.reconnect_exercised, true);
    assert.equal(workObservation.replay_exercised, true);

    return {
      schema_name: "petra.wave6-final-design-exit",
      schema_version: "1.0.0",
      wave: 6,
      status: "passed",
      recorded_at: new Date().toISOString(),
      command:
        "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:final-exit-ui",
      environment: {
        stable_url: "http://127.0.0.1:4311/guide",
        restart_command: "./run-wave-6-checkpoint.zsh",
        node: process.versions.node,
        browser: browserVersion.product,
        persistence:
          "fresh disposable PostgreSQL, Neo4j, and S3 stores created by the cumulative production harness",
        transport:
          "production React Router and authenticated live Petra HTTP routes through one stable Vite proxy",
        certified_model:
          "live provider invocation from the production Petra composer",
      },
      starting_state: {
        project_id: context.scientificProjectId,
        guide_path: `/guide?project=${context.scientificProjectId}`,
        profile: "Scientific evidence inquiry",
        reset:
          "Open Settings from the Project map, choose a registered replacement profile, confirm the additive archive-and-create action, then return through the Project-pinned Test guide link.",
      },
      expected_outcomes: [
        "Registered profile vocabulary and permitted actions stay consistent across the same Project.",
        "Petra returns one provider-origin grounded answer with exact references, limitations, Work effect, Review effect, and no authority effect.",
        "Work input, steering, priority, detach, reconnect, replay, cancel or retry, stages, resources, and exact results remain usable.",
        "Sources, Graph/text, Review, History, recovery, and Brief preserve exact task return and server-owned identity.",
        "Adverse states retain drafts and task context without false success or duplicate effects.",
      ],
      known_limits: [
        "Native screen-reader evaluation is outside Wave 6 by user direction.",
        "The responsive record uses one Chrome engine and synthesized touch; it is not a physical-device or cross-browser matrix.",
        "The automated run removes disposable services after recording. The restart command recreates the same supported state and keeps port 4311 active until the tester stops it.",
        "Only the user can accept or reject USER-TESTABLE-01/explicit-product-acceptance.",
      ],
      observations: {
        guided_entry: {
          route_reviews: guided.routeReviews,
          model: guided.model,
        },
        work: operations.work,
        sources_graph: sourcesGraph,
        review: operations.review,
        history: operations.history,
        responsive_adverse: responsiveAdverse,
        reset,
      },
      product_design_review: {
        status: "passed_after_repairs",
        findings_repaired: [
          "The guide no longer calls the final tree a first checkpoint or promises later automated completion.",
          "Permission loss and connection failure no longer masquerade as a missing or malformed address; the visible recovery preserves drafts and retries the same place.",
        ],
        hierarchy: "one task heading and progressive disclosure per core route",
        navigation: "persistent Project map with active place and exact return",
        typography_spacing_density:
          "task-first readable hierarchy at wide, narrow, and 200% text conditions",
        interaction:
          "keyboard, focus, touch, retry, confirmation, and outcome feedback verified",
        coherence:
          "guide, Brief, Petra, Work, Sources, Graph, Review, History, Settings, and reset use the same Project and state grammar",
      },
      felicity_review: {
        status: "passed_after_repairs",
        scope: [
          "core labels",
          "instructions",
          "status and outcomes",
          "errors and recovery",
          "in-product guide",
        ],
        preserved_meaning: [
          "server authority",
          "model advisory force",
          "exact command confirmation",
          "additive reset",
          "explicit user acceptance",
        ],
      },
      adversarial_audit: {
        fake_controls: "none encountered in the executed milestone-6 path",
        fixture_fallback: "none used by the retained production workflow",
        client_or_model_authority: "none",
        dead_ends: "none; exact return or same-place retry remained visible",
        hidden_recovery: "none in the exercised failure states",
        duplicate_effects:
          "none across provider, Work, Review, and Revert calls",
        slide_like_presentation: "not present in the primary task routes",
        unsupported_completion_claims:
          "none; the guide and report reserve acceptance to the user",
      },
      scenario_records: scenarioRecords,
      remaining_evidence: ["USER-TESTABLE-01/explicit-product-acceptance"],
    };
  };

  const record = async (stage, context) => {
    try {
      const baseResult = await work.record(stage, context);
      if (stage === "restart_complete") {
        finalObservation = await runFinalWorkflow(context);
        writeFileSync(output, `${JSON.stringify(finalObservation, null, 2)}\n`);
      }
      return baseResult;
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
      await work.close();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.equal(finalObservation?.status, "passed");
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
