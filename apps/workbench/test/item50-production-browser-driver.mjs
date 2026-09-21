import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const progress = (message) =>
  process.stderr.write(`[wave4-item50-browser] ${message}\n`);
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const closeChrome = async ({ chrome, cdp, profilePrefix }) => {
  try {
    if (cdp.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
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
    assert.ok(chrome.profile.startsWith(join(tmpdir(), profilePrefix)));
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};

export const startItem50ProductionBrowser = async ({
  root,
  getBackendUrl,
  scientificProjectId,
  writingProjectId,
  scientificReviewSessionId,
  writingReviewSessionId,
}) => {
  const calls = [];
  const consoleErrors = [];
  const workbench = await startWorkbench({ root, getBackendUrl, calls });
  progress(`workbench listening at ${workbench.url}`);
  const chrome = await startChrome({ profilePrefix: "petra-wave4-item50-" });
  const cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  let initialBriefSnapshot;
  let closed = false;

  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "assert"].includes(message.params?.type)
    ) {
      consoleErrors.push(message.params.args?.map((arg) => arg.value));
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
    assert.equal(navigation.errorText, undefined);
    try {
      await until(ready, label);
      await evaluate("document.fonts.ready");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nAPI calls: ${JSON.stringify(calls)}\nConsole: ${JSON.stringify(consoleErrors)}`,
        { cause: error },
      );
    }
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
  const reviewPath = `/projects/${scientificProjectId}/review/${scientificReviewSessionId}`;
  const applyPosts = () =>
    calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    );
  const resetBrowserEmulation = async () => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Emulation.setEmulatedMedia", { features: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await evaluate('document.documentElement.style.fontSize = ""');
  };

  const recordConversationAndBlockedCorrection = async ({
    projectThreadId,
    projectTurnId,
    workUnitId,
    interactionRunId,
    correctedCandidateId,
    correctedCandidateRevision,
    correctedCandidateText,
    modelActorId,
    modelCallId,
  }) => {
    await navigate(
      `/projects/${scientificProjectId}/petra`,
      'document.querySelector(".petra-thread") !== null',
      "retained natural-conversation thread",
    );
    const threadDetail = latestCall((call) =>
      call.path.endsWith(
        `/projects/${scientificProjectId}/threads/${projectThreadId}`,
      ),
    );
    assert.equal(threadDetail?.status, 200);
    assert.equal(threadDetail?.authorization, "Bearer petra-local-development");
    assert.equal(threadDetail?.json?.schema_name, "petra.project-thread-view");
    assert.equal(
      threadDetail?.json?.content?.summary?.thread_ref?.project_thread_id,
      projectThreadId,
    );
    const turn = threadDetail.json.content.turns[0].turn;
    assert.equal(turn.project_turn_id, projectTurnId);
    assert.equal(turn.execution.work_unit_ref.work_unit_id, workUnitId);
    assert.equal(
      turn.execution.interaction_run_ref.interaction_run_id,
      interactionRunId,
    );
    assert.equal(turn.response.force, "proposal");
    assert.equal(turn.response.authority_effect, "none");
    const modelReadiness = latestCall((call) =>
      call.path.endsWith(`/projects/${scientificProjectId}/model-readiness`),
    );
    assert.equal(modelReadiness?.status, 200);
    assert.equal(
      modelReadiness?.authorization,
      "Bearer petra-local-development",
    );
    assert.equal(
      modelReadiness?.json?.schema_name,
      "petra.project-model-readiness-view",
    );
    assert.equal(modelReadiness?.json?.project_id, scientificProjectId);
    assert.equal(modelReadiness?.json?.readiness?.state, "ready");
    assert.equal(
      modelReadiness?.json?.readiness?.role?.semantic_key,
      "scientific.grounded-synthesist",
    );
    assert.equal(modelReadiness?.json?.readiness?.provider?.state, "ready");
    assert.equal(modelReadiness?.json?.readiness?.context?.state, "bound");
    assert.equal(
      modelReadiness?.json?.readiness?.command?.endpoint,
      "/api/interactions/run",
    );
    const composer = await evaluate(`(() => {
      const ask = [...document.querySelectorAll("button")].find(
        (element) => element.textContent.trim() === "Ask Petra",
      );
      return {
        readiness: document.querySelector(
          ".petra-model-readiness[data-readiness=ready]",
        ) !== null,
        draft: document.querySelector(".petra-composer textarea")?.value,
        askAvailable: ask !== undefined && ask.getAttribute("aria-disabled") !== "true",
      };
    })()`);
    assert.deepEqual(composer, {
      readiness: true,
      draft: modelReadiness.json.readiness.command.registered_prompt,
      askAvailable: true,
    });
    const threadText = await evaluate("document.body.innerText");
    for (const text of [
      projectThreadId,
      "Proposal · Review still required",
      "Explanation and task direction only",
      "Open linked Work",
      modelReadiness.json.readiness.role.label,
      "The certified response is advisory. Work and Review outcomes remain separate.",
    ]) {
      assert.ok(
        threadText.includes(text),
        `Missing conversation boundary: ${text}`,
      );
    }
    assert.equal(
      threadText.includes(
        "The model response boundary is unavailable. No prompt will be sent.",
      ),
      false,
      "The ready Project rendered the retired unavailable composer.",
    );

    const graphCallStart = calls.length;
    await navigate(
      `/projects/${scientificProjectId}/graph?layer=working`,
      'document.querySelector(".graph-surface") !== null',
      "model-corrected live working Graph",
    );
    const overlay = latestCall((call) =>
      call.path.includes("/relationship-overlay"),
    );
    assert.equal(overlay?.status, 200);
    assert.equal(
      overlay?.json?.schema_name,
      "petra.project-relationship-overlay-view",
    );
    assert.equal(
      calls
        .slice(graphCallStart)
        .some((call) => call.path.includes("/relationship-view")),
      false,
      "The item 50 working Graph used fixture/legacy fallback.",
    );
    assert.ok(
      JSON.stringify(overlay.json).includes(correctedCandidateId) &&
        JSON.stringify(overlay.json).includes(modelActorId),
      "The live overlay lost corrected candidate or model-producer identity.",
    );
    const graphText = await evaluate("document.body.innerText");
    for (const text of [
      "Working — not authoritative",
      "Current authority",
      correctedCandidateText,
      "Labels and arrows carry relationship meaning",
    ]) {
      assert.ok(
        graphText.includes(text),
        `Missing model Graph meaning: ${text}`,
      );
    }
    const visualCounts = await evaluate(`({
      nodes: document.querySelectorAll(".graph-node").length,
      relationships: document.querySelectorAll(".graph-edge").length,
    })`);
    await evaluate(`${button("Text")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".graph-text-view") !== null');
    assert.equal(
      await evaluate(`document.activeElement === ${button("Text")}`),
      true,
    );
    assert.deepEqual(
      await evaluate(`({
        nodes: document.querySelectorAll(".graph-text-view__nodes > li").length,
        relationships: document.querySelectorAll("section[aria-labelledby=graph-text-relationships-title] > ol > li").length,
      })`),
      visualCounts,
    );

    await navigate(
      reviewPath,
      'document.querySelector(".review-session") !== null',
      "corrected blocked Review",
    );
    const reviewCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${scientificReviewSessionId}`),
    );
    assert.equal(reviewCall?.status, 200);
    assert.equal(reviewCall?.json?.content?.session?.revision, 2);
    const member = reviewCall.json.content.members[0];
    assert.equal(
      member.working_state.candidate.working_candidate_id,
      correctedCandidateId,
    );
    assert.equal(
      member.working_state.candidate.revision,
      correctedCandidateRevision,
    );
    assert.equal(member.validation.state, "blocked");
    const reviewJson = JSON.stringify(reviewCall.json);
    assert.ok(reviewJson.includes(modelActorId));
    assert.ok(reviewJson.includes(modelCallId));
    const exactLimitation =
      member.working_state.candidate.qualifications.statements.find(
        (statement) => statement.qualification_kind === "limitation",
      )?.statement;
    assert.equal(typeof exactLimitation, "string");
    assert.equal(typeof member.validation.recovery, "string");
    const reviewText = await evaluate("document.body.innerText");
    for (const text of [
      correctedCandidateText,
      "Material validation state",
      member.validation.label,
      member.validation.detail,
      member.validation.recovery,
      "Candidate · working",
      "Current · authoritative",
      "Limitations and qualifications",
      exactLimitation,
      correctedCandidateId,
      "Change basis",
      "Recovery",
      "Apply unavailable",
    ]) {
      assert.ok(
        reviewText.includes(text),
        `Missing corrected/blocked state: ${text}`,
      );
    }
    assert.ok(reviewText.toLocaleLowerCase().includes("generaliz"));
    assert.equal(reviewText.includes("Apply displayed ChangeSet"), false);
    await evaluate(
      'document.querySelector(".review-origin-disclosure > summary").focus()',
    );
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".review-origin-disclosure").open');
    assert.equal(
      await evaluate(
        'document.activeElement === document.querySelector(".review-origin-disclosure > summary")',
      ),
      true,
    );
    const completeReviewText = await evaluate("document.body.innerText");
    for (const identity of [
      correctedCandidateId,
      modelActorId,
      modelCallId,
      "Exact working origin and provenance",
      "Provenance records",
    ])
      assert.ok(
        completeReviewText.includes(identity),
        `The complete Review text lost origin or provenance identity: ${identity}`,
      );
    assert.notEqual(
      await evaluate(
        'getComputedStyle(document.querySelector(".review-validation")).borderTopStyle',
      ),
      "none",
    );
    const accessibility = await send("Accessibility.getFullAXTree");
    for (const heading of [
      "Material validation state",
      "Basis",
      "Limitations and qualifications",
      "Decision",
    ]) {
      assert.ok(
        accessibility.nodes.some(
          (node) =>
            node.role?.value === "heading" && node.name?.value === heading,
        ),
        `The corrected Review accessibility tree lacks ${heading}.`,
      );
    }
    return {
      thread_view_hash: threadDetail.json.content_hash,
      overlay_hash: overlay.json.content_hash,
      corrected_review_hash: reviewCall.json.content_hash,
      limitation: exactLimitation,
      model_actor_id: modelActorId,
      model_call_id: modelCallId,
      blocked_reason: member.validation.detail,
      recovery: member.validation.recovery,
    };
  };

  const recordStaleReview = async () => {
    await navigate(
      reviewPath,
      'document.querySelector(".review-session") !== null',
      "stale Review",
    );
    const reviewCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${scientificReviewSessionId}`),
    );
    assert.equal(reviewCall?.json?.content?.session?.snapshot_state, "stale");
    const member = reviewCall.json.content.members[0];
    assert.equal(member.validation.state, "blocked");
    assert.equal(typeof member.validation.recovery, "string");
    const text = await evaluate("document.body.innerText");
    for (const value of [
      "stale",
      "Refresh Review",
      "does not approve, reject, apply",
      member.validation.label,
      member.validation.detail,
      member.validation.recovery,
    ])
      assert.ok(text.includes(value), `Missing stale Review meaning: ${value}`);
    assert.equal(
      await evaluate(
        `${button("Prepare changes to apply")}.getAttribute("aria-disabled")`,
      ),
      "true",
    );
    assert.equal(text.includes("Apply displayed ChangeSet"), false);
    await evaluate(`${button("Refresh Review")}.focus()`);
    assert.equal(
      await evaluate(`document.activeElement === ${button("Refresh Review")}`),
      true,
    );
    return {
      stale_review_hash: reviewCall.json.content_hash,
      blocked_reason: member.validation.detail,
      recovery: member.validation.recovery,
    };
  };

  const recordRefreshedAndWritingReview = async ({ refreshedRevision }) => {
    await navigate(
      reviewPath,
      `${button("Prepare changes to apply")} !== undefined`,
      "refreshed natural-conversation Review",
    );
    const reviewCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${scientificReviewSessionId}`),
    );
    assert.equal(
      reviewCall?.json?.content?.session?.revision,
      refreshedRevision,
    );
    assert.equal(reviewCall?.json?.content?.session?.snapshot_state, "current");
    const scientificText = await evaluate("document.body.innerText");
    for (const value of [
      "Applicable checks passed",
      "Prepare changes to apply",
      "Apply unavailable",
      "Apply and reject each require their own exact server-prepared commitment and one explicit human decision",
      "Limitations and qualifications",
    ]) {
      assert.ok(
        scientificText.includes(value),
        `Missing refreshed Review meaning: ${value}`,
      );
    }

    await navigate(
      `/projects/${writingProjectId}/review/${writingReviewSessionId}`,
      'document.querySelector(".review-session") !== null',
      "paired controlled-writing Review",
    );
    const writingCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${writingReviewSessionId}`),
    );
    assert.equal(writingCall?.status, 200);
    assert.equal(writingCall?.json?.schema_version, "1.3.0");
    const writingMember = writingCall.json.content.members[0];
    assert.equal(typeof writingMember.candidate.kind_label, "string");
    assert.equal(typeof writingMember.basis[0]?.label, "string");
    assert.equal(typeof writingMember.basis[0]?.relation, "string");
    const writingText = await evaluate("document.body.innerText");
    for (const value of [
      writingMember.basis[0]?.label,
      writingMember.basis[0]?.relation,
      "Commitment unavailable",
      "Preparation unavailable",
      "Apply unavailable",
      "No controlled-writing ChangeSet operation, Approval, or Apply path",
    ]) {
      assert.ok(
        writingText.includes(value),
        `Missing paired-profile boundary: ${value}`,
      );
    }
    assert.equal(writingText.includes("Prepare changes to apply"), false);

    await navigate(
      `/projects/${scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "pre-Apply Brief",
    );
    const brief = latestCall(
      (call) =>
        call.path === `/api/queries/projects/${scientificProjectId}/brief`,
    );
    assert.equal(brief?.status, 200);
    initialBriefSnapshot = brief.json.snapshot_hash;
    await navigate(
      reviewPath,
      `${button("Prepare changes to apply")} !== undefined`,
      "manual checkpoint Review",
    );
    return {
      refreshed_review_hash: reviewCall.json.content_hash,
      writing_review_hash: writingCall.json.content_hash,
      writing_candidate_label: writingMember.candidate.kind_label,
      writing_basis_label: writingMember.basis[0]?.label,
      writing_relationship_label: writingMember.basis[0]?.relation,
    };
  };

  const recordPanelResize = async () => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Emulation.setEmulatedMedia", { features: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await navigate(
      "/__fixtures/shell",
      "document.querySelector('.shell-pane-resizer[aria-label=\"Resize Research map\"]') !== null",
      "post-freeze frozen-shell panel resize",
    );
    const selector = '.shell-pane-resizer[aria-label="Resize Research map"]';
    const initial = await evaluate(`(() => {
      const handle = document.querySelector(${JSON.stringify(selector)});
      const pane = document.getElementById(handle.getAttribute("aria-controls"));
      return {
        value: Number(handle.getAttribute("aria-valuenow")),
        valueText: handle.getAttribute("aria-valuetext"),
        minimum: Number(handle.getAttribute("aria-valuemin")),
        maximum: Number(handle.getAttribute("aria-valuemax")),
        orientation: handle.getAttribute("aria-orientation"),
        paneWidth: pane.getBoundingClientRect().width,
        selectedIdentity: document.body.innerText.includes(
          "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB@1",
        ),
      };
    })()`);
    assert.equal(initial.value, 216);
    assert.equal(initial.valueText, "216 pixels");
    assert.equal(initial.minimum, 176);
    assert.equal(initial.maximum, 320);
    assert.equal(initial.orientation, "vertical");
    assert.equal(initial.selectedIdentity, true);
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).focus()`,
    );
    await key("ArrowRight", "ArrowRight", 39);
    await until(
      `document.querySelector(${JSON.stringify(selector)}).getAttribute("aria-valuenow") === "224"`,
      "keyboard panel resize",
    );
    const resized = await evaluate(`(() => {
      const handle = document.querySelector(${JSON.stringify(selector)});
      const pane = document.getElementById(handle.getAttribute("aria-controls"));
      return {
        value: Number(handle.getAttribute("aria-valuenow")),
        valueText: handle.getAttribute("aria-valuetext"),
        paneWidth: pane.getBoundingClientRect().width,
        focusRetained: document.activeElement === handle,
        selectedIdentity: document.body.innerText.includes(
          "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB@1",
        ),
      };
    })()`);
    assert.equal(resized.value, initial.value + 8);
    assert.equal(resized.valueText, "224 pixels");
    assert.equal(resized.paneWidth, initial.paneWidth + 8);
    assert.equal(resized.focusRetained, true);
    assert.equal(resized.selectedIdentity, true);
    const accessibility = await send("Accessibility.getFullAXTree");
    assert.ok(
      accessibility.nodes.some(
        (node) =>
          node.role?.value === "separator" &&
          node.name?.value === "Resize Research map",
      ),
      "The named pane separator is absent from Chrome's accessibility tree.",
    );
    assert.deepEqual(consoleErrors, []);
    return {
      route: "/__fixtures/shell",
      browser_boundary: "frozen shell fixture in headless Google Chrome",
      input: "keyboard ArrowRight",
      initial_value: initial.value,
      resulting_value: resized.value,
      focus_retained: resized.focusRetained,
      selected_identity_retained: resized.selectedIdentity,
      accessibility_role: "separator",
    };
  };

  const applyDisplayedChangeSet = async ({
    expectedModelActorId,
    expectedModelCallId,
  } = {}) => {
    const postCount = applyPosts().length;
    await evaluate(`${button("Prepare changes to apply")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".review-apply-preview") !== null');
    assert.equal(
      await evaluate(
        'document.activeElement?.getAttribute("aria-label") === "Prepared commitment"',
      ),
      true,
    );
    assert.equal(
      applyPosts().length,
      postCount,
      "Preparing the model-produced change sent a decision.",
    );
    const prepared = await evaluate(
      'document.querySelector(".review-apply-preview").innerText',
    );
    for (const value of [
      "One complete atomic ChangeSet",
      "ReviewPolicy: not applicable",
      "Delegated and automatic Apply are unavailable",
    ])
      assert.ok(prepared.includes(value));
    if (
      expectedModelActorId !== undefined ||
      expectedModelCallId !== undefined
    ) {
      await evaluate(
        'document.querySelector(".review-apply-preview details").open = true',
      );
      const completePrepared = await evaluate(
        'document.querySelector(".review-apply-preview").innerText',
      );
      for (const identity of [expectedModelActorId, expectedModelCallId]) {
        if (identity !== undefined)
          assert.ok(
            completePrepared.includes(identity),
            `The complete prepared commitment lost ${identity}.`,
          );
      }
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
    );
    assert.notEqual(
      await evaluate(
        'getComputedStyle(document.querySelector(".review-validation")).borderTopStyle',
      ),
      "none",
    );
    assert.ok(
      ["0s", "0.01ms", "0.00001s", "1e-05s"].includes(
        await evaluate(
          `getComputedStyle(${button("Apply displayed ChangeSet")}).transitionDuration`,
        ),
      ),
    );
    await evaluate(
      `${button("Apply displayed ChangeSet")}.scrollIntoView({ block: "center", behavior: "instant" })`,
    );
    await evaluate(
      "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
    );
    const rect = await evaluate(`(() => {
      const value = ${button("Apply displayed ChangeSet")}.getBoundingClientRect();
      return { x: value.left + value.width / 2, y: value.top + value.height / 2,
        height: value.height, left: value.left, right: value.right };
    })()`);
    assert.ok(rect.height >= 44 && rect.left >= 0 && rect.right <= 375);
    assert.equal(
      await evaluate(`(() => {
        const target = ${button("Apply displayed ChangeSet")};
        return target.contains(document.elementFromPoint(
          ${JSON.stringify(rect.x)},
          ${JSON.stringify(rect.y)},
        ));
      })()`),
      true,
      "The exact Apply control is not the touch hit-test target.",
    );
    await send("Input.synthesizeTapGesture", {
      x: rect.x,
      y: rect.y,
      duration: 100,
      gestureSourceType: "touch",
    });
    await until(
      'document.body.innerText.includes("The displayed ChangeSet applied")',
    );
    const applyCall = latestCall(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    );
    assert.equal(applyCall?.status, 200);
    assert.equal(
      applyCall?.requestJson?.schema_name,
      "petra.review-session-apply-request",
    );
    assert.equal(
      applyCall?.json?.schema_name,
      "petra.review-session-apply-result",
    );
    assert.equal(applyPosts().length, postCount + 1);
    assert.equal(
      applyCall.json.assessment.content.review.projection.state,
      "catching_up",
    );
    assert.ok(
      applyCall.json.assessment.content.review.projection.pending_records > 0,
    );
    const text = await evaluate("document.body.innerText");
    for (const value of [
      "This does not mean every Review member applied",
      "Applied—updating views",
      "Projection lag does not permit resubmission",
      "Application effect confirmed",
      "Reload Review",
    ])
      assert.ok(text.includes(value), `Missing post-Apply meaning: ${value}`);
    for (const item of applyCall.json.assessment.content.preservation) {
      assert.ok(
        text.includes(item.kind.replaceAll("_", " ")) &&
          text.includes(item.state) &&
          text.includes(item.detail),
        `Missing post-Apply preservation: ${item.kind}`,
      );
    }
    return { request: applyCall.requestJson, result: applyCall.json };
  };

  const recordGovernedCommandFailure = async ({
    failureReviewSessionId,
    advanceAuthority,
  }) => {
    await resetBrowserEmulation();
    const failurePath = `/projects/${scientificProjectId}/review/${failureReviewSessionId}`;
    await navigate(
      failurePath,
      `${button("Prepare changes to apply")} !== undefined`,
      "governed command-failure Review",
    );
    const reviewCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${failureReviewSessionId}`),
    );
    assert.equal(reviewCall?.status, 200);
    assert.equal(reviewCall?.json?.content?.session?.snapshot_state, "current");
    const before = await evaluate("document.body.innerText");
    for (const value of [
      "This isolated adverse-state member exists only to demonstrate exact-current command failure and recovery",
      "Prepare changes to apply",
      "Apply unavailable",
      "Recovery",
    ])
      assert.ok(value && before.includes(value));

    const callStart = calls.length;
    const postCount = applyPosts().length;
    await evaluate(`${button("Prepare changes to apply")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".review-apply-preview") !== null');
    assert.equal(
      await evaluate(
        'document.activeElement?.getAttribute("aria-label") === "Prepared commitment"',
      ),
      true,
    );
    assert.equal(applyPosts().length, postCount);
    const checkpointCall = calls
      .slice(callStart)
      .find((call) => call.path.includes("/apply-checkpoint"));
    assert.equal(checkpointCall?.status, 200);
    assert.equal(
      checkpointCall?.json?.binding?.authorization_basis?.kind,
      "authenticated_human_checkpoint",
    );
    assert.equal(
      checkpointCall?.json?.binding?.review_policy?.applicability,
      "not_applicable",
    );

    await advanceAuthority();
    await evaluate(`${button("Apply displayed ChangeSet")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until(
      'document.body.innerText.includes("Reconciliation required")',
      "governed command-failure result",
    );
    const applyCall = calls
      .slice(callStart)
      .reverse()
      .find((call) => call.method === "POST" && call.path.endsWith("/apply"));
    assert.equal(applyCall?.status, 200);
    assert.equal(applyPosts().length, postCount + 1);
    assert.equal(applyCall.json.outcome, "reconciliation_required");
    assert.ok(
      applyCall.json.steps.every(
        (step) => step.observation !== "executed" && step.event === undefined,
      ),
    );
    assert.equal(applyCall.json.steps[0]?.error_code, "REVIEW_APPLY_STALE");
    assert.ok(applyCall.json.assessment.content.preservation.length > 0);
    assert.equal(
      await evaluate(
        'document.activeElement?.id === "review-apply-observation"',
      ),
      true,
    );
    const text = await evaluate("document.body.innerText");
    for (const value of [
      "Reconciliation required",
      "REVIEW_APPLY_STALE",
      "This is a read-only assessment. No recovery execution is offered",
      "Reload Review",
      "Refresh Review",
    ])
      assert.ok(
        text.includes(value),
        `Missing governed failure recovery meaning: ${value}`,
      );
    if (applyCall.json.assessment.content.groups.length === 0) {
      assert.ok(text.includes("No associated ChangeSets were supplied"));
      assert.ok(text.includes("no effect is inferred"));
    } else {
      for (const group of applyCall.json.assessment.content.groups) {
        assert.ok(
          text.includes(group.effect.replaceAll("_", " ")) &&
            text.includes(group.effect_basis),
          `Missing governed failure effect boundary: ${group.change_set.change_set_id}`,
        );
      }
    }
    for (const item of applyCall.json.assessment.content.preservation) {
      assert.ok(
        text.includes(item.kind.replaceAll("_", " ")) &&
          text.includes(item.state) &&
          text.includes(item.detail),
        `Missing governed failure preservation: ${item.kind}`,
      );
    }
    for (const limitation of applyCall.json.assessment.content.limitations)
      assert.ok(text.includes(limitation));
    assert.equal(text.includes("Retry"), false);
    const accessibility = await send("Accessibility.getFullAXTree");
    const accessibleNodesById = new Map(
      accessibility.nodes.map((node) => [node.nodeId, node]),
    );
    const accessibleSubtreeText = (node) =>
      [
        node.name?.value ?? "",
        ...(node.childIds ?? []).map((childId) => {
          const child = accessibleNodesById.get(childId);
          return child === undefined ? "" : accessibleSubtreeText(child);
        }),
      ].join(" ");
    assert.ok(
      accessibility.nodes.some(
        (node) =>
          node.role?.value === "alert" &&
          accessibleSubtreeText(node).includes("Reconciliation required"),
      ),
      "The governed failure is absent from Chrome's accessibility tree.",
    );
    assert.deepEqual(consoleErrors, []);
    return { request: applyCall.requestJson, result: applyCall.json };
  };

  const recordRestartedEvidence = async ({
    item49ReviewHash,
    failureReviewSessionId,
    failureReviewHash,
  }) => {
    await resetBrowserEmulation();
    await navigate(
      reviewPath,
      'document.querySelector(".review-session") !== null',
      "restarted item-49 Review",
    );
    const item49Call = latestCall((call) =>
      call.path.endsWith(`/reviews/${scientificReviewSessionId}`),
    );
    assert.equal(item49Call?.json?.content_hash, item49ReviewHash);
    await navigate(
      `/projects/${scientificProjectId}/review/${failureReviewSessionId}`,
      'document.querySelector(".review-session") !== null',
      "restarted governed failure Review",
    );
    const failureCall = latestCall((call) =>
      call.path.endsWith(`/reviews/${failureReviewSessionId}`),
    );
    assert.equal(failureCall?.json?.content_hash, failureReviewHash);
    const text = await evaluate("document.body.innerText");
    for (const value of ["stale", "Refresh Review", "Apply unavailable"])
      assert.ok(value && text.includes(value));
    assert.deepEqual(consoleErrors, []);
    return {
      item49_review_hash: item49Call.json.content_hash,
      failure_review_hash: failureCall.json.content_hash,
    };
  };

  const recordRestartedBriefAndRevert = async ({ appliedEventId }) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Emulation.setEmulatedMedia", { features: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await evaluate('document.documentElement.style.fontSize = ""');
    await navigate(
      `/projects/${scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "restarted authoritative Brief",
    );
    const briefCall = latestCall(
      (call) =>
        call.path === `/api/queries/projects/${scientificProjectId}/brief`,
    );
    assert.equal(briefCall?.status, 200);
    assert.notEqual(briefCall.json.snapshot_hash, initialBriefSnapshot);
    assert.ok(
      (await evaluate("document.body.innerText")).includes(
        "Inspect History event",
      ),
    );

    const eventPath = `/projects/${scientificProjectId}/history/${appliedEventId}`;
    await navigate(
      eventPath,
      'document.querySelector(".history-event") !== null',
      "governed Revert event",
    );
    const episodeCall = latestCall((call) =>
      call.path.endsWith(`/history/events/${appliedEventId}`),
    );
    const recoveryCall = latestCall((call) =>
      call.path.endsWith(`/history/events/${appliedEventId}/recovery`),
    );
    assert.equal(episodeCall?.status, 200);
    assert.equal(
      recoveryCall?.json?.content?.assessment?.state,
      "eligible_for_preview",
    );
    let text = await evaluate("document.body.innerText");
    for (const value of [
      appliedEventId,
      "Event and consequence",
      "Impact and recovery boundary",
      "Eligible for a revision-bound compensation preview",
      "Revert is additive compensation",
      "No compensation preview, plan, or execution has been requested",
    ])
      assert.ok(
        text.includes(value),
        `Missing governed Revert boundary: ${value}`,
      );

    const executeCount = calls.filter((call) =>
      call.path.endsWith("/recovery/execute"),
    ).length;
    await evaluate(`${button("Read governed Revert preview")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".history-event__preview") !== null');
    assert.equal(
      await evaluate(
        'document.activeElement === document.querySelector(".history-event__revert-state")',
      ),
      true,
    );
    assert.equal(
      calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
      executeCount,
    );
    text = await evaluate("document.body.innerText");
    assert.ok(text.includes("Read-only compensation preview loaded"));
    assert.ok(text.includes("Complete preview, results, and command sequence"));

    await evaluate(`(() => {
      const values = [
        ["Reason for governed Revert", "The exact accepted pair must be compensated after the governed recovery review."],
        ["Approval rationale", "The complete revision-bound compensation plan is explicitly approved."],
      ];
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      for (const [label, value] of values) {
        const area = [...document.querySelectorAll("textarea")].find((candidate) =>
          document.querySelector("label[for='" + candidate.id + "']")?.textContent.includes(label));
        setter.call(area, value);
        area.dispatchEvent(new Event("input", { bubbles: true }));
      }
    })()`);
    await until(
      `${button("Confirm and compose Revert plan")}.getAttribute("aria-disabled") !== "true"`,
    );
    await evaluate(`${button("Confirm and compose Revert plan")}.focus()`);
    await key("Enter", "Enter", 13, "\r");
    await until('document.querySelector(".history-event__plan") !== null');
    const planCall = latestCall(
      (call) => call.method === "POST" && call.path.endsWith("/recovery/plan"),
    );
    assert.equal(planCall?.status, 200);
    assert.equal(planCall?.requestJson?.confirmation?.confirmed, true);
    assert.equal(
      calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
      executeCount,
    );
    assert.ok(
      (await evaluate("document.body.innerText")).includes(
        "Persistence and execution remain not performed",
      ),
    );

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
    );
    const executeRect = await evaluate(`(() => {
      const value = ${button("Execute governed Revert")}.getBoundingClientRect();
      return { x: value.left + value.width / 2, y: value.top + value.height / 2,
        height: value.height, left: value.left, right: value.right };
    })()`);
    assert.ok(
      executeRect.height >= 44 &&
        executeRect.left >= 0 &&
        executeRect.right <= 375,
    );
    await evaluate(
      `${button("Execute governed Revert")}.scrollIntoView({ block: "center", behavior: "instant" })`,
    );
    const centeredRect = await evaluate(`(() => {
      const value = ${button("Execute governed Revert")}.getBoundingClientRect();
      return { x: value.left + value.width / 2, y: value.top + value.height / 2 };
    })()`);
    assert.equal(
      await evaluate(`(() => {
        const target = ${button("Execute governed Revert")};
        return target.contains(document.elementFromPoint(
          ${JSON.stringify(centeredRect.x)},
          ${JSON.stringify(centeredRect.y)},
        ));
      })()`),
      true,
      "The Revert control is not the hit-test target after scrolling.",
    );
    await evaluate(`${button("Execute governed Revert")}.focus()`);
    assert.equal(
      await evaluate(
        `document.activeElement === ${button("Execute governed Revert")}`,
      ),
      true,
    );
    await key("Enter", "Enter", 13, "\r");
    await until(
      'document.body.innerText.includes("Governed Revert completed")',
    );
    const executeCall = latestCall(
      (call) =>
        call.method === "POST" && call.path.endsWith("/recovery/execute"),
    );
    assert.equal(executeCall?.status, 200);
    assert.equal(
      executeCall?.requestJson?.execution_confirmation?.confirmed,
      true,
    );
    assert.equal(executeCall?.json?.content?.outcome, "completed");
    assert.equal(executeCall?.json?.content?.completed_prefix, 3);
    assert.ok(
      executeCall.json.content.steps.every(
        (step) => step.state === "retained_success",
      ),
    );
    const executionText = await evaluate("document.body.innerText");
    for (const value of [
      "Governed Revert completed",
      "Completed prefix: 3 of 3",
      "The original action and this compensation both remain in History",
      "Complete governed Revert execution record",
    ])
      assert.ok(
        executionText.includes(value),
        `Missing Revert outcome: ${value}`,
      );

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Emulation.setEmulatedMedia", { features: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await evaluate('document.documentElement.style.fontSize = ""');
    await navigate(
      eventPath,
      'document.querySelector(".history-event") !== null',
      "already-compensated History event",
    );
    const finalRecovery = latestCall((call) =>
      call.path.endsWith(`/history/events/${appliedEventId}/recovery`),
    );
    assert.equal(
      finalRecovery?.json?.content?.assessment?.state,
      "already_compensated",
    );
    const finalText = await evaluate("document.body.innerText");
    for (const value of [
      "This exact authoritative change is already compensated",
      "Revert unavailable",
      "A current eligible single-ChangeSet recovery assessment",
    ])
      assert.ok(
        finalText.includes(value),
        `Missing post-compensation unavailable state: ${value}`,
      );
    assert.equal(
      await evaluate(`${button("Execute governed Revert")} === undefined`),
      true,
    );
    assert.equal(
      calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
      executeCount + 1,
    );
    assert.deepEqual(consoleErrors, []);
    return {
      applied_event_id: appliedEventId,
      episode_hash: episodeCall.json.content_hash,
      recovery_before_hash: recoveryCall.json.content_hash,
      compensation_plan_id: planCall.json.compensation_plan_id,
      compensation_change_set_id:
        planCall.json.content.change_set.change_set_id,
      execution_hash: executeCall.json.content_hash,
      compensation_event_ids: executeCall.json.content.steps.map(
        (step) => step.event_ref?.event_id,
      ),
      recovery_after_hash: finalRecovery.json.content_hash,
    };
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await closeChrome({
        chrome,
        cdp,
        profilePrefix: "petra-wave4-item50-",
      });
    } finally {
      await workbench.vite.close();
    }
  };

  return {
    recordConversationAndBlockedCorrection,
    recordStaleReview,
    recordRefreshedAndWritingReview,
    recordPanelResize,
    applyDisplayedChangeSet,
    recordGovernedCommandFailure,
    recordRestartedEvidence,
    recordRestartedBriefAndRevert,
    close,
  };
};
