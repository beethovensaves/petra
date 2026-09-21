import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { derivePetraId } from "@petra/core";
import { canonicalize } from "json-canonicalize";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const link = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const round = (value) => Math.round(value * 1_000) / 1_000;

const closeChrome = async ({ chrome, cdp }) => {
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
    assert.ok(chrome.profile.startsWith(join(tmpdir(), "petra-wave5-live-")));
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};

export const startWave5CumulativeBrowser = async ({
  root,
  getBackendUrl,
  scientificProjectId,
  scientificReviewSessionId,
  writingProjectId,
  writingReviewSessionId,
}) => {
  const calls = [];
  const consoleFailures = [];
  const workbench = await startWorkbench({
    root,
    getBackendUrl,
    calls,
    getInspectionLinks: () => inspectionUrls(),
  });
  const chrome = await startChrome({ profilePrefix: "petra-wave5-live-" });
  const cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  let closed = false;
  let contextualGraphPath;
  let reviewGraphPath;
  let correctionPreviewObservation;

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
    send("Network.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  const browser = await send("Browser.getVersion");

  const navigate = async (path, ready, label) => {
    const started = performance.now();
    const navigation = await send("Page.navigate", {
      url: new URL(path, workbench.url).href,
    });
    assert.equal(navigation.errorText, undefined);
    try {
      await until(ready, label);
      await evaluate("document.fonts.ready");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(
          calls.slice(-12).map((call) => ({
            method: call.method,
            path: call.path,
            status: call.status,
            request_schema: call.requestJson?.schema_name,
            response_schema: call.json?.schema_name,
            error_code: call.json?.error?.code,
            error_message: call.json?.error?.message,
          })),
        )}\nConsole: ${JSON.stringify(consoleFailures)}`,
        { cause: error },
      );
    }
    return round(performance.now() - started);
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

  const activate = async (expression) => {
    await evaluate(`${expression}.focus()`);
    await key("Enter", "Enter", 13, "\r");
  };
  const latestCall = (predicate) => [...calls].reverse().find(predicate);
  const focusedCall = () =>
    latestCall(
      (call) =>
        call.method === "POST" && /\/focused-graph(?:[?]|$)/u.test(call.path),
    );
  const analysisCall = () =>
    latestCall((call) => call.path.endsWith("/focused-graph/analysis"));

  const prepareReviewActionTarget = async () => {
    const reviewPath = `/projects/${scientificProjectId}/review/${scientificReviewSessionId}`;
    const duration = await navigate(
      reviewPath,
      'document.querySelector(".review-session") !== null',
      "refreshed production Review",
    );
    reviewGraphPath = await evaluate(
      `${link("Inspect bounded current relationships")}.getAttribute("href")`,
    );
    assert.ok(reviewGraphPath?.includes("actionKind=governed_correction"));
    const review = await evaluate(
      `fetch(${JSON.stringify(`/api/queries/projects/${scientificProjectId}/reviews/${scientificReviewSessionId}`)}, {
        headers: { authorization: "Bearer petra-local-development" },
      }).then(async (response) => ({ status: response.status, body: await response.json() }))`,
    );
    assert.equal(review.status, 200);
    assert.equal(review.body.content.session.lifecycle, "open");
    const preApplyUrl = new URL(reviewGraphPath, workbench.url);
    const memberId = preApplyUrl.searchParams.get("actionReviewMemberId");
    const reviewMember = review.body.content.members.find(
      (member) => member.review_member_id === memberId,
    );
    assert.ok(reviewMember !== undefined);
    assert.equal(reviewMember.working_state.relationships.length, 1);
    const reviewRelationship = reviewMember.working_state.relationships[0];
    assert.ok(reviewRelationship !== undefined);
    const focusRef =
      reviewMember.working_state.candidate.profile_object.object_record_ref;
    assert.deepEqual(
      {
        record_id: preApplyUrl.searchParams.get("focusId"),
        revision: Number(preApplyUrl.searchParams.get("focusRevision")),
        record_hash: preApplyUrl.searchParams.get("focusHash"),
      },
      {
        record_id: focusRef.record_id,
        revision: focusRef.revision,
        record_hash: focusRef.record_hash,
      },
      "The Review Graph link must retain its exact candidate focus.",
    );
    preApplyUrl.searchParams.set(
      "question",
      "Which recorded relationship is bound to this open Review?",
    );
    preApplyUrl.searchParams.set("semanticLayer", "working");
    for (const prefix of ["focus", "originRef", "returnTarget"]) {
      preApplyUrl.searchParams.set(`${prefix}Id`, focusRef.record_id);
      preApplyUrl.searchParams.set(
        `${prefix}Revision`,
        String(focusRef.revision),
      );
      preApplyUrl.searchParams.set(`${prefix}Hash`, focusRef.record_hash);
    }
    const preApplyGraphPath = `${preApplyUrl.pathname}${preApplyUrl.search}`;
    const graphDuration = await navigate(
      preApplyGraphPath,
      'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
      "open-Review correction Graph",
    );
    const graph = focusedCall();
    assert.equal(graph?.status, 200);
    const ownedRelationship = graph.json.content.relationships.find(
      (relationship) =>
        relationship.layer === "working" &&
        relationship.relationship_ref.element_id ===
          reviewRelationship.working_relationship_id &&
        relationship.relationship_ref.revision === reviewRelationship.revision,
    );
    assert.ok(
      ownedRelationship !== undefined,
      "The exact Review WorkingRelationship was not composed in Graph.",
    );
    await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-exploration__selection select");
      control.focus();
      control.value = ${JSON.stringify(ownedRelationship.relationship_key)};
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(ownedRelationship.relationship_key)}`,
      "exact Review relationship selection",
    );
    assert.equal(
      await evaluate(
        `${button("Preview edit relationship")}.getAttribute("aria-disabled")`,
      ),
      null,
    );
    await activate(button("Preview edit relationship"));
    await until(
      'document.querySelector(".focused-graph-action-preview")?.dataset.previewKind === "governed_correction"',
      "live governed correction preview",
    );
    const previewCall = latestCall((call) =>
      call.path.endsWith("/focused-graph/action-preview"),
    );
    assert.equal(previewCall?.status, 200);
    assert.equal(
      previewCall.requestJson.selection.selected_keys[0],
      ownedRelationship.relationship_key,
    );
    assert.equal(
      previewCall.requestJson.target.review_member_id,
      reviewMember.review_member_id,
    );
    const preview = previewCall.json.content.preview;
    assert.equal(preview.preview_kind, "governed_correction");
    assert.equal(preview.review_member_id, reviewMember.review_member_id);
    assert.equal(
      preview.selected_relationship.relationship_ref.element_id,
      reviewRelationship.working_relationship_id,
    );
    assert.equal(
      preview.selected_relationship.relationship_ref.revision,
      reviewRelationship.revision,
    );
    const previewRelationship = preview.working_relationship_refs.find(
      (relationship) =>
        relationship.working_relationship_id ===
        reviewRelationship.working_relationship_id,
    );
    assert.deepEqual(previewRelationship, {
      working_relationship_id: reviewRelationship.working_relationship_id,
      revision: reviewRelationship.revision,
      content_hash: reviewRelationship.content_hash,
    });
    assert.deepEqual(previewCall.json.content.authority_boundary, {
      postgresql_authoritative: true,
      neo4j_projection_only: true,
      focused_graph_owner_reused: true,
      working_candidate_owner: "reused",
      review_owner: "reused",
      suggested_action_owner: "not_applicable",
      work_preview_owner: "not_applicable",
      preview_is_read_only: true,
      selection_grants_authority: false,
      renderer_state_accepted: false,
      command_issued: false,
      work_started: false,
    });
    const previewText = await evaluate(
      'document.querySelector(".focused-graph-action-preview").innerText',
    );
    for (const text of [
      reviewMember.review_member_id,
      reviewRelationship.working_relationship_id,
      `revision ${reviewRelationship.revision}`,
      "No command issued",
    ]) {
      assert.ok(
        previewText.includes(text),
        `Correction preview omitted ${text}.`,
      );
    }

    await activate(button("Close preview and keep selection"));
    await until(
      `document.querySelector(".focused-graph-action-preview") === null && document.activeElement === ${button("Preview edit relationship")}`,
      "correction preview close and trigger focus restoration",
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".focused-graph-exploration__selection select").value',
      ),
      ownedRelationship.relationship_key,
    );

    await activate(button("Preview edit relationship"));
    await until(
      'document.querySelector(".focused-graph-action-preview")?.dataset.previewKind === "governed_correction"',
      "restored governed correction preview",
    );
    await activate(link("Open this exact candidate in Review"));
    await until(
      `window.location.pathname === ${JSON.stringify(reviewPath)} && new URLSearchParams(window.location.search).get("reviewMemberId") === ${JSON.stringify(reviewMember.review_member_id)} && window.location.hash === "#review-comparison-title" && document.activeElement?.id === "review-comparison-title"`,
      "exact Review member and comparison return focus",
    );
    const reviewAfter = await evaluate(
      `fetch(${JSON.stringify(`/api/queries/projects/${scientificProjectId}/reviews/${scientificReviewSessionId}`)}, {
        headers: { authorization: "Bearer petra-local-development" },
      }).then(async (response) => ({ status: response.status, body: await response.json() }))`,
    );
    assert.equal(reviewAfter.status, 200);
    assert.equal(reviewAfter.body.content_hash, review.body.content_hash);
    assert.deepEqual(
      reviewAfter.body.content.members.find(
        (member) => member.review_member_id === reviewMember.review_member_id,
      )?.working_state.relationships,
      reviewMember.working_state.relationships,
    );
    correctionPreviewObservation = {
      graph_duration_ms: graphDuration,
      live_route_availability: "preview_executed",
      open_review_session_id: scientificReviewSessionId,
      review_member_id: reviewMember.review_member_id,
      working_relationship_ref: {
        working_relationship_id: reviewRelationship.working_relationship_id,
        revision: reviewRelationship.revision,
        content_hash: reviewRelationship.content_hash,
      },
      returned_relationship_ref: ownedRelationship.relationship_ref,
      graph_content_hash: graph.json.content_hash,
      preview_content_hash: previewCall.json.content_hash,
      preview_trigger_focus_restored: true,
      exact_review_member_returned: true,
      exact_review_focus_restored: true,
      review_authority_unchanged: true,
      command_issued:
        previewCall.json.content.authority_boundary.command_issued,
    };
    return {
      duration_ms: duration,
      action_target_sha256: sha256(
        new URL(reviewGraphPath, workbench.url).searchParams.toString(),
      ),
      correction_preview: structuredClone(correctionPreviewObservation),
    };
  };

  const recordFocusedGraph = async () => {
    assert.ok(reviewGraphPath !== undefined);
    const timings = {};
    const focus = {};
    const history = await evaluate(`fetch(
      ${JSON.stringify(`/api/queries/projects/${scientificProjectId}/history/recent`)},
      { headers: { authorization: "Bearer petra-local-development" } },
    ).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    assert.equal(history.status, 200);
    const overlay = await evaluate(`fetch(
      ${JSON.stringify(`/api/queries/projects/${scientificProjectId}/relationship-overlay`)},
      { headers: { authorization: "Bearer petra-local-development" } },
    ).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    assert.equal(overlay.status, 200);
    const relatedCurrentNodeKeys = new Set(
      overlay.body.content.relationships
        .filter((relationship) => relationship.layer === "current")
        .flatMap((relationship) => [
          relationship.source_node_key,
          relationship.target_node_key,
        ]),
    );
    const projectedClaimNode = overlay.body.content.nodes.find(
      (node) =>
        node.layer === "current" &&
        node.object_kind === "claim" &&
        relatedCurrentNodeKeys.has(node.node_key),
    );
    assert.ok(
      projectedClaimNode !== undefined,
      `Relationship overlay exposes no related projected authoritative Claim: ${JSON.stringify(
        {
          nodes: overlay.body.content.nodes.map((node) => ({
            node_key: node.node_key,
            layer: node.layer,
            object_kind: node.object_kind,
            owner: node.owner,
          })),
          relationships: overlay.body.content.relationships.map(
            (relationship) => ({
              layer: relationship.layer,
              source_node_key: relationship.source_node_key,
              target_node_key: relationship.target_node_key,
            }),
          ),
        },
      )}`,
    );
    const projectedClaim = projectedClaimNode.owner.record_ref;
    const impactChange = history.body.content.changes.find((change) =>
      change.targets.some(
        (target) =>
          target.semantic_key === "scientific.claim" &&
          target.object_id === projectedClaim.record_id &&
          target.revision === projectedClaim.revision,
      ),
    );
    assert.ok(
      impactChange !== undefined,
      `History exposes no event for the exact projected Claim: ${JSON.stringify(
        history.body.content.changes.map((change) => ({
          event_id: change.event_ref.event_id,
          targets: change.targets,
        })),
      )}`,
    );
    const location = await evaluate(`fetch(
      ${JSON.stringify(`/api/queries/projects/${scientificProjectId}/object-location`)} + "?" + new URLSearchParams({
        semanticKey: "scientific.claim",
        objectId: ${JSON.stringify(projectedClaim.record_id)},
        taskIntent: "inspect",
      }),
      { headers: { authorization: "Bearer petra-local-development" } },
    ).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    assert.equal(location.status, 200);
    assert.equal(location.body.content.resolution.state, "current");
    assert.equal(
      location.body.content.resolution.current_ref.semantic_key,
      "scientific.claim",
    );
    assert.equal(
      location.body.content.resolution.current_ref.object_id,
      projectedClaim.record_id,
    );
    const contextualUrl = new URL(reviewGraphPath, workbench.url);
    contextualUrl.searchParams.set(
      "question",
      "Which recorded relationships, including Working changes, concern this Claim at the represented projection position?",
    );
    contextualUrl.searchParams.set("semanticLayer", "working");
    for (const prefix of ["focus", "originRef", "returnTarget"]) {
      contextualUrl.searchParams.set(`${prefix}Id`, projectedClaim.record_id);
      contextualUrl.searchParams.set(
        `${prefix}Revision`,
        String(projectedClaim.revision),
      );
      contextualUrl.searchParams.set(
        `${prefix}Hash`,
        projectedClaim.record_hash,
      );
    }
    contextualGraphPath = `${contextualUrl.pathname}${contextualUrl.search}`;
    assert.ok(contextualGraphPath?.includes("graphEntry=1"));
    const entryPreflight = await evaluate(`(async () => {
      try {
        const [{ focusedGraphEntryFromSearch }, { focusedGraphRequestFromEntry }] = await Promise.all([
          import("/src/product/focused-graph-entry.tsx"),
          import("/src/product/project-data.ts"),
        ]);
        const brief = await fetch(${JSON.stringify(`/api/queries/projects/${scientificProjectId}/brief`)}, {
          headers: { authorization: "Bearer petra-local-development" },
        }).then(response => response.json());
        const url = new URL(${JSON.stringify(contextualGraphPath)}, window.location.href);
        const entry = focusedGraphEntryFromSearch(${JSON.stringify(scientificProjectId)}, url.searchParams);
        const request = await focusedGraphRequestFromEntry(entry, brief.content.definition);
        return { ok: true, request };
      } catch (error) {
        return { ok: false, error: error?.stack ?? String(error) };
      }
    })()`);
    assert.equal(
      entryPreflight.ok,
      true,
      `Contextual focused Graph entry preflight failed: ${entryPreflight.error}`,
    );
    timings.contextual_graph_ms = await navigate(
      contextualGraphPath,
      'document.querySelector(".focused-graph-exploration") !== null && document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
      "post-Apply Review contextual focused Graph",
    );
    let body = await evaluate("document.body.innerText");
    for (const text of [
      "Opened from Review",
      "Entry scope and position",
      "Requested snapshot",
      "Represented snapshot",
      "Projection position",
      "finite limits, and omissions",
    ]) {
      assert.ok(body.includes(text), `Contextual entry omitted ${text}.`);
    }
    focus.contextual_heading = await evaluate(
      'document.activeElement === document.querySelector(".graph-heading h1")',
    );
    assert.equal(focus.contextual_heading, true);

    const current = focusedCall();
    assert.equal(current?.status, 200);
    assert.equal(current?.json?.schema_name, "petra.focused-graph-view");
    assert.equal(current.requestJson.origin.origin_kind, "review");
    const currentView = current.json;
    const currentRequest = current.requestJson;
    const currentSnapshot = currentView.content.requested_snapshot;
    const historicalPosition =
      overlay.body.content.positions.authoritative.projection;
    const historicalSnapshotMaterial = {
      project_id: scientificProjectId,
      project_definition_ref: currentRequest.project_definition_ref,
      semantic_layer: "current",
      event_position: historicalPosition.represented_event_position,
      stream_revision: historicalPosition.represented_stream_revision,
      graph_target_sequence: historicalPosition.represented_target_sequence,
      position_kind: "requested",
    };
    const historicalSnapshot = {
      snapshot_id: derivePetraId(
        "snapshot",
        canonicalize(historicalSnapshotMaterial),
      ),
      revision: 1,
      event_position: historicalPosition.represented_event_position,
      content_hash: sha256(canonicalize(historicalSnapshotMaterial)),
    };
    const graphFacts = await evaluate(
      '[...document.querySelectorAll(".focused-graph-facts")].map((element) => element.innerText.trim())',
    );
    const relationshipKeys = currentView.content.relationships.map(
      (relationship) => relationship.relationship_key,
    );
    assert.ok(relationshipKeys.length > 0);
    assert.equal(graphFacts.length, relationshipKeys.length);
    for (const fact of graphFacts) {
      for (const label of [
        "Direction",
        "Origin",
        "Authority",
        "Basis",
        "SourceSpan availability",
        "Limitations",
      ]) {
        assert.ok(fact.includes(label), `Relationship fact omitted ${label}.`);
      }
    }
    await activate(button("Text"));
    await until(
      'document.querySelector("[data-focused-peer=text]") !== null',
      "complete textual peer",
    );
    focus.text_control = await evaluate(
      `document.activeElement === ${button("Text")}`,
    );
    assert.equal(focus.text_control, true);
    const textFacts = await evaluate(
      '[...document.querySelectorAll(".focused-graph-facts")].map((element) => element.innerText.trim())',
    );
    assert.deepEqual(textFacts, graphFacts);
    body = await evaluate("document.body.innerText");
    for (const text of [
      "every returned path step",
      "Relationship evidence matrix",
      "Semantic destinations",
      "Registered actions",
      "Scope limitations",
    ]) {
      assert.ok(body.includes(text), `Textual peer omitted ${text}.`);
    }
    await activate(button("Graph"));
    await until(
      'document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
      "restored graph alternative",
    );

    const relationshipKey = relationshipKeys[0];
    assert.ok(relationshipKey !== undefined);
    assert.ok(correctionPreviewObservation !== undefined);
    await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-exploration__selection select");
      control.focus();
      control.value = ${JSON.stringify(relationshipKey)};
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(relationshipKey)}`,
      "relationship selection for live Details",
    );

    await activate(button("Inspect selected Details"));
    await until(
      'document.querySelector(".focused-graph-details") !== null',
      "live exact Details",
    );
    focus.details_heading = await evaluate(
      'document.activeElement?.id === "focused-graph-details-title"',
    );
    assert.equal(focus.details_heading, true);
    const details = latestCall((call) =>
      call.path.endsWith("/focused-graph/details"),
    );
    assert.equal(details?.status, 200);
    const sourceSummary =
      'document.querySelector(".focused-graph-source-inspection > summary")';
    assert.equal(await evaluate(`${sourceSummary} !== null`), true);
    await activate(sourceSummary);
    await until(
      'document.querySelector(".focused-graph-source-inspection").open === true',
      "exact source inspection",
    );
    focus.source_summary = await evaluate(
      `document.activeElement === ${sourceSummary}`,
    );
    assert.equal(focus.source_summary, true);
    body = await evaluate("document.body.innerText");
    const sourceState = await evaluate(
      'document.querySelector(".focused-graph-source-inspection").dataset.sourceState',
    );
    const sourceTexts =
      sourceState === "available"
        ? [
            "exact projectsource inspection",
            "sourcespan",
            "representation",
            "rights",
            "authority position",
          ]
        : [
            "source representation unavailable",
            "exact sourcespan identity remains visible",
            "does not establish absence or lack of support",
          ];
    const normalizedDetailsBody = body.toLowerCase();
    for (const text of [
      ...sourceTexts,
      "snapshot",
      "projection position",
      "return context",
    ]) {
      assert.ok(
        normalizedDetailsBody.includes(text),
        `Details/provenance omitted ${text}.`,
      );
    }
    await activate(button("Return to graph selection"));
    await until(
      'document.querySelector(".focused-graph-details") === null',
      "Details return",
    );
    focus.details_return = await evaluate(
      `document.activeElement === ${button("Inspect selected Details")}`,
    );
    assert.equal(focus.details_return, true);

    const returnFocusId = new URL(
      contextualGraphPath,
      workbench.url,
    ).searchParams.get("returnFocus");
    assert.ok(returnFocusId !== null);
    await activate(link("Return to Review"));
    await until(
      `window.location.hash === ${JSON.stringify(`#${returnFocusId}`)} && document.activeElement?.id === ${JSON.stringify(returnFocusId)}`,
      "exact Review return focus",
    );
    focus.context_return = true;

    const directUrl = new URL(contextualGraphPath, workbench.url);
    directUrl.searchParams.set("origin", "direct");
    directUrl.searchParams.delete("originRefId");
    directUrl.searchParams.delete("originRefRevision");
    directUrl.searchParams.delete("originRefHash");
    timings.direct_graph_ms = await navigate(
      directUrl.href,
      'document.querySelector(".focused-graph-exploration") !== null',
      "direct focused Graph entry",
    );
    body = await evaluate("document.body.innerText");
    assert.ok(body.includes("Opened from direct Graph entry"));
    const direct = focusedCall();
    assert.equal(direct.requestJson.origin.origin_kind, "direct");
    assert.deepEqual(direct.requestJson.focus_ref, currentRequest.focus_ref);
    assert.deepEqual(direct.requestJson.limits, currentRequest.limits);
    assert.deepEqual(
      direct.json.content.requested_snapshot,
      currentView.content.requested_snapshot,
    );

    await navigate(
      contextualGraphPath,
      'document.querySelector(".focused-graph-exploration") !== null',
      "restored contextual working Graph",
    );
    const working = focusedCall();
    assert.equal(working.requestJson.semantic_layer, "working");
    assert.equal(working.json.content.semantic_layer, "working");
    const recipe = await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-expansion-controls > label select");
      return {
        value: control?.value,
        labels: [...(control?.options ?? [])].map((option) => option.textContent.trim()),
      };
    })()`);
    assert.equal(recipe.value, "scientific.graph.show-downstream");
    assert.deepEqual(recipe.labels, ["Show downstream effects"]);

    const expansionTarget = working.json.content.nodes.find(
      (node) =>
        node.record_ref.record_id === working.requestJson.focus_ref.record_id &&
        node.record_ref.revision === working.requestJson.focus_ref.revision &&
        node.record_ref.record_hash ===
          working.requestJson.focus_ref.record_hash,
    );
    assert.ok(
      expansionTarget !== undefined,
      "The exact focused Claim is not represented for expansion.",
    );
    await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-exploration__selection select");
      control.focus();
      control.value = ${JSON.stringify(expansionTarget.node_key)};
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(expansionTarget.node_key)}`,
      "exact cumulative Graph expansion target selection",
    );

    await evaluate(`(() => {
      const controls = [...document.querySelectorAll(".focused-graph-expansion-controls label")];
      for (const label of controls) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox === null) continue;
        const keep = ["outgoing", "support", "canonical record"].includes(
          label.textContent.trim(),
        );
        if (checkbox.checked !== keep) checkbox.click();
      }
      const depth = controls
        .find((label) => label.textContent.includes("Finite depth"))
        ?.querySelector("select");
      depth.value = "3";
      depth.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `(() => {
        const checked = [...document.querySelectorAll('.focused-graph-expansion-controls input[type="checkbox"]:checked')]
          .map((input) => input.closest("label").textContent.trim())
          .sort();
        const depth = [...document.querySelectorAll(".focused-graph-expansion-controls label")]
          .find((label) => label.textContent.includes("Finite depth"))
          ?.querySelector("select")?.value;
        return JSON.stringify(checked) === JSON.stringify(${JSON.stringify(
          ["support", "canonical record", "outgoing"].sort(),
        )}) && depth === "3";
      })()`,
      "registered cumulative Graph filters and finite depth",
    );

    const expansionReturnHrefBefore = await evaluate(
      `${link("Return to Review")}.getAttribute("href")`,
    );
    await activate(button("Expand selected object"));
    await until(
      'document.querySelector(".focused-graph-expansion-summary") !== null && document.body.innerText.includes("Accepted Show downstream effects for the exact active snapshot")',
      "cumulative live registered expansion result",
    );
    const expanded = focusedCall();
    assert.equal(expanded?.status, 200);
    assert.equal(expanded.json.schema_name, "petra.focused-graph-view");
    assert.equal(expanded.json.schema_version, "1.1.0");
    assert.equal(
      expanded.requestJson.exploration.recipe_semantic_key,
      "scientific.graph.show-downstream",
    );
    assert.deepEqual(
      expanded.requestJson.exploration.target_ref,
      expansionTarget.record_ref,
    );
    assert.equal(expanded.requestJson.exploration.maximum_depth, 3);
    assert.deepEqual(expanded.requestJson.exploration.filters, {
      meaning_kinds: ["support"],
      directions: ["outgoing"],
      origins: ["canonical_record"],
    });
    assert.equal(expanded.requestJson.semantic_layer, "working");
    assert.deepEqual(
      expanded.requestJson.expected_snapshot,
      working.json.content.requested_snapshot,
    );
    assert.deepEqual(
      expanded.requestJson.project_definition_ref,
      working.requestJson.project_definition_ref,
    );
    assert.deepEqual(
      expanded.requestJson.return_destination,
      working.requestJson.return_destination,
    );
    assert.equal(
      expanded.json.content.task.request_id,
      expanded.requestJson.request_id,
    );
    assert.equal(expanded.json.content.semantic_layer, "working");
    assert.deepEqual(
      expanded.json.content.requested_snapshot,
      expanded.requestJson.expected_snapshot,
    );
    assert.deepEqual(
      expanded.json.content.profile.project_definition_ref,
      expanded.requestJson.project_definition_ref,
    );
    assert.deepEqual(
      expanded.json.content.exploration.target_ref,
      expansionTarget.record_ref,
    );
    assert.deepEqual(
      expanded.json.content.exploration.filters,
      expanded.requestJson.exploration.filters,
    );
    assert.equal(expanded.json.content.exploration.maximum_depth, 3);
    assert.ok(expanded.json.content.groups.length > 0);
    assert.ok(Array.isArray(expanded.json.content.scope.omissions));
    assert.ok(
      Object.values(expanded.json.content.exploration.accounting).every(
        (value) => value !== undefined,
      ),
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".focused-graph-exploration__selection select").value',
      ),
      expansionTarget.node_key,
    );
    const expansionSummary = await evaluate(
      'document.querySelector(".focused-graph-expansion-summary").innerText',
    );
    for (const text of [
      "Show downstream effects",
      expansionTarget.record_ref.record_id,
      "Normalized meanings",
      "support",
      "Normalized directions",
      "outgoing",
      "Normalized origins",
      "canonical record",
      "Capped members",
      "Hidden relationships",
      "Restricted paths",
      "Cyclic paths",
      "Incomplete paths",
      "Unknown paths",
      "do not establish absence or completeness",
    ]) {
      assert.ok(
        expansionSummary.includes(text),
        `Cumulative expansion summary omitted ${text}.`,
      );
    }
    assert.equal(
      await evaluate(
        'document.querySelectorAll(".focused-graph-expansion-summary__groups > li").length',
      ),
      expanded.json.content.groups.length,
    );
    const expansionReturnHrefAfter = await evaluate(
      `${link("Return to Review")}.getAttribute("href")`,
    );
    assert.equal(expansionReturnHrefAfter, expansionReturnHrefBefore);
    assert.equal(
      expansionReturnHrefAfter,
      new URL(contextualGraphPath, workbench.url).searchParams.get(
        "returnPath",
      ),
    );
    await activate(link("Return to Review"));
    await until(
      `window.location.hash === ${JSON.stringify(`#${returnFocusId}`)} && document.activeElement?.id === ${JSON.stringify(returnFocusId)}`,
      "exact Review return after cumulative expansion",
    );
    focus.expansion_context_return = true;

    await navigate(
      contextualGraphPath,
      'document.querySelector(".focused-graph-exploration") !== null',
      "restored contextual working Graph after expansion return",
    );
    await activate(button("Bookmark this view"));
    await until(
      'document.querySelector(".focused-graph-saved-questions ol") !== null',
      "bookmarked exact view",
    );
    await activate(button("Radial"));
    await activate(button("Back"));
    await activate(button("Forward"));

    await activate(link("Current"));
    await until(
      'document.querySelector(".graph-state")?.textContent.includes("Current")',
      "Return to Current position",
    );
    const restoredCurrent = focusedCall();
    assert.equal(restoredCurrent.requestJson.semantic_layer, "current");

    const historicalChange = history.body.content.changes.find(
      (change) =>
        change.event_ref.event_position === historicalSnapshot.event_position,
    );
    assert.ok(
      historicalChange !== undefined,
      `History did not retain represented event ${historicalSnapshot.event_position}.`,
    );
    const historicalUrl = new URL(
      windowlessLocation(restoredCurrent),
      workbench.url,
    );
    historicalUrl.searchParams.set("semanticLayer", "historical");
    historicalUrl.searchParams.set(
      "historicalSnapshotId",
      historicalSnapshot.snapshot_id,
    );
    historicalUrl.searchParams.set(
      "historicalSnapshotRevision",
      String(historicalSnapshot.revision),
    );
    historicalUrl.searchParams.set(
      "historicalSnapshotEventPosition",
      String(historicalSnapshot.event_position),
    );
    historicalUrl.searchParams.set(
      "historicalSnapshotHash",
      historicalSnapshot.content_hash,
    );
    historicalUrl.searchParams.set(
      "historicalRecordedAt",
      historicalChange.recorded_at,
    );
    for (const key of [
      "snapshotId",
      "snapshotRevision",
      "snapshotEventPosition",
      "snapshotHash",
      "actionKind",
      "actionRequestedChange",
      "actionReviewSessionId",
      "actionReviewMemberId",
    ]) {
      historicalUrl.searchParams.delete(key);
    }
    timings.historical_ms = await navigate(
      historicalUrl.href,
      'document.body.innerText.includes("Historical · read only")',
      "retained Historical position",
    );
    const historical = focusedCall();
    assert.equal(historical.requestJson.semantic_layer, "historical");
    assert.equal(historical.json.content.semantic_layer, "historical");
    assert.equal(
      historical.json.content.temporal_position.at.value,
      historicalChange.recorded_at,
    );
    await activate(link("Return to current"));
    await until(
      'document.querySelector(".graph-state")?.textContent.includes("Current")',
      "Historical Return to current",
    );

    await activate(link("Compare Current / Working changes"));
    await until(
      'document.querySelector(".focused-graph-analysis")?.dataset.analysisKind === "comparison"',
      "dedicated comparison",
    );
    const comparison = analysisCall();
    assert.equal(comparison?.status, 200);
    assert.equal(comparison.requestJson.task_kind, "comparison");
    body = await evaluate("document.body.innerText");
    const normalizedComparisonBody = body.toLowerCase();
    for (const text of [
      "Comparison",
      "Current · before",
      "Working changes · after",
      "Supplied differences",
      "same exact positions, selection, facts, limitations, destinations, and actions",
    ]) {
      assert.ok(
        normalizedComparisonBody.includes(text.toLowerCase()),
        `Comparison omitted ${text}.`,
      );
    }
    await activate(button("Text"));
    await until(
      'document.querySelector(".focused-graph-analysis__positions")?.dataset.focusedAnalysisPeer === "text"',
      "comparison textual parity",
    );
    await activate(link("Time · recorded"));
    await until(
      'document.querySelector(".focused-graph-analysis")?.dataset.analysisKind === "time"',
      "dedicated time analysis",
    );
    const time = analysisCall();
    assert.equal(time.requestJson.task_kind, "time");
    body = await evaluate("document.body.innerText");
    for (const text of ["Time", "Supplied dates", "Unknown date"])
      assert.ok(
        body.toLowerCase().includes(text.toLowerCase()),
        `Time view omitted ${text}.`,
      );
    await activate(button("Text"));
    await until(
      'document.querySelector(".focused-graph-analysis__positions")?.dataset.focusedAnalysisPeer === "text"',
      "time textual parity",
    );
    assert.deepEqual(consoleFailures, []);

    const impactIdentities = await evaluate(`import(
      "/src/product/focused-graph-entry.tsx"
    ).then(module => ({
      requestId: module.createFocusedGraphRequestId(),
      analysisRequestId: module.createFocusedGraphAnalysisRequestId(),
    }))`);
    const impactUrl = new URL(
      windowlessLocation(restoredCurrent),
      workbench.url,
    );
    impactUrl.searchParams.set("requestId", impactIdentities.requestId);
    impactUrl.searchParams.set("presentation", "impact");
    impactUrl.searchParams.set(
      "analysisRequestId",
      impactIdentities.analysisRequestId,
    );
    impactUrl.searchParams.set(
      "historyEventId",
      impactChange.event_ref.event_id,
    );
    const impactStarted = performance.now();
    const impactNavigation = await send("Page.navigate", {
      url: impactUrl.href,
    });
    assert.equal(impactNavigation.errorText, undefined);
    await until(
      'document.querySelector(".focused-graph-analysis")?.dataset.analysisKind === "impact"',
      "dedicated impact analysis",
    );
    await evaluate("document.fonts.ready");
    timings.impact_ms = round(performance.now() - impactStarted);
    const impact = analysisCall();
    assert.equal(impact.status, 200);
    assert.equal(impact.requestJson.task_kind, "impact");
    assert.equal(
      impact.json.content.analysis.assessed_consequences.state,
      "unavailable",
    );
    body = await evaluate("document.body.innerText");
    for (const text of [
      "Impact",
      "Impact and assessed consequences",
      "Exact dependency records",
      "Assessed consequences",
    ])
      assert.ok(
        body.toLowerCase().includes(text.toLowerCase()),
        `Impact view omitted ${text}.`,
      );
    await activate(button("Text"));
    await until(
      'document.querySelector(".focused-graph-analysis__positions")?.dataset.focusedAnalysisPeer === "text"',
      "impact textual parity",
    );
    assert.deepEqual(consoleFailures, []);

    return {
      browser: {
        product: browser.product,
        user_agent: browser.userAgent,
        protocol_version: browser.protocolVersion,
      },
      route_transport: "live authenticated HTTP through the production server",
      timings_ms: timings,
      calls: {
        focused_graph: calls.filter((call) =>
          /\/focused-graph(?:[/?]|$)/u.test(call.path),
        ).length,
        details: calls.filter((call) => call.path.endsWith("/details")).length,
        action_preview: calls.filter((call) =>
          call.path.endsWith("/action-preview"),
        ).length,
        analysis: calls.filter((call) => call.path.endsWith("/analysis"))
          .length,
      },
      contextual_entry: {
        origin: currentRequest.origin.origin_kind,
        question: currentRequest.question,
        focus_ref: currentRequest.focus_ref,
        limits: currentRequest.limits,
        requested_snapshot: currentSnapshot,
        return_path: new URL(
          contextualGraphPath,
          workbench.url,
        ).searchParams.get("returnPath"),
      },
      direct_entry: {
        origin: direct.requestJson.origin.origin_kind,
        content_hash: direct.json.content_hash,
      },
      relation_review: {
        relationship_count: relationshipKeys.length,
        meaning_kinds: [
          ...new Set(
            currentView.content.relationships.map(
              (relationship) => relationship.meaning_kind,
            ),
          ),
        ].sort(),
        non_color_fields: [
          "term",
          "predicate",
          "direction",
          "origin",
          "authority_position",
          "basis",
          "limitations",
        ],
      },
      provenance_review: {
        details_content_hash: details.json.content_hash,
        exact_source_inspections: details.json.content.relationships.flatMap(
          (relationship) => relationship.source_inspections,
        ).length,
        inspected_source_state: sourceState,
        source_states: details.json.content.relationships.flatMap(
          (relationship) =>
            relationship.source_inspections.map(
              (inspection) => inspection.state,
            ),
        ),
        requested_snapshot: details.json.content.graph.requested_snapshot,
        projection_position: details.json.content.graph.projection_position,
        omissions: details.json.content.graph.scope.omissions.length,
      },
      graph_text_parity: {
        relationship_count: graphFacts.length,
        normalized_facts_sha256: sha256(JSON.stringify(graphFacts)),
        exact_match: true,
      },
      focus,
      correction_preview: correctionPreviewObservation,
      positions: {
        current: restoredCurrent.json.content_hash,
        working: working.json.content_hash,
        historical: historical.json.content_hash,
        historical_recorded_at: historicalChange.recorded_at,
        comparison: comparison.json.content_hash,
        impact: {
          live_route_state: "passed",
          content_hash: impact.json.content_hash,
          event_id: impactChange.event_ref.event_id,
          assessed_consequences: {
            state: impact.json.content.analysis.assessed_consequences.state,
            coverage:
              impact.json.content.analysis.assessed_consequences.coverage,
            reason: impact.json.content.analysis.assessed_consequences.reason,
          },
        },
        impact_event_id: impactChange.event_ref.event_id,
        time: time.json.content_hash,
      },
      expansion: {
        live_availability: "registered_and_executed",
        registration: {
          semantic_key: recipe.value,
          label: recipe.labels[0],
          contract: "petra.focused-graph-view@1.1.0",
        },
        request: {
          request_id: expanded.requestJson.request_id,
          expected_snapshot: expanded.requestJson.expected_snapshot,
          target_ref: expanded.requestJson.exploration.target_ref,
          maximum_depth: expanded.requestJson.exploration.maximum_depth,
          filters: expanded.requestJson.exploration.filters,
          return_destination: expanded.requestJson.return_destination,
        },
        response: {
          content_hash: expanded.json.content_hash,
          represented_snapshot: expanded.json.content.represented_snapshot,
          result_state:
            expanded.json.content.exploration.accounting.result_state,
          accounting: expanded.json.content.exploration.accounting,
          groups: expanded.json.content.groups.map((group) => ({
            group_key: group.group_key,
            label: group.label,
            returned_count: group.returned_count,
            filtered_count: group.filtered_count,
            hidden_count: group.hidden_count,
            coverage: group.coverage,
          })),
          omissions: expanded.json.content.scope.omissions,
        },
        selection_preserved: true,
        disclosure_rendered: true,
        exact_context_return_executed: true,
        adverse_supplement:
          "UX-FX25 deterministic stale, late-response, and omission boundary",
      },
    };
  };

  const recordProjectionLag = async () => {
    assert.ok(contextualGraphPath !== undefined);
    const duration = await navigate(
      contextualGraphPath,
      'document.querySelector(".focused-graph-exploration") !== null',
      "projection-lag focused Graph",
    );
    const graph = focusedCall();
    assert.equal(graph?.status, 200);
    assert.equal(graph.json.content.projection_position.state, "catching_up");
    const body = await evaluate("document.body.innerText");
    assert.ok(body.includes("Projection position · catching up"));
    assert.ok(body.includes("PostgreSQL remains authoritative"));
    return {
      duration_ms: duration,
      content_hash: graph.json.content_hash,
      requested_snapshot: graph.json.content.requested_snapshot,
      projection_position: graph.json.content.projection_position,
      authority_source: graph.json.content.projection_position.authority_source,
    };
  };

  const recordRegisteredGraphExpansion = async () => {
    await navigate(
      `/projects/${scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "representative Brief",
    );
    const graphEntryPath = await evaluate(`(async () => {
      const {
        createFocusedGraphRequestId,
        focusedGraphDefinitionRef,
        focusedGraphEntryPath,
        scientificFocusedGraphEntryDraft,
      } = await import("/src/product/focused-graph-entry.tsx");
      const [briefResponse, overlayResponse] = await Promise.all([
        fetch(${JSON.stringify(`/api/queries/projects/${scientificProjectId}/brief`)}, {
          headers: { authorization: "Bearer petra-local-development" },
        }),
        fetch(${JSON.stringify(`/api/queries/projects/${scientificProjectId}/relationship-overlay`)}, {
          headers: { authorization: "Bearer petra-local-development" },
        }),
      ]);
      if (!briefResponse.ok || !overlayResponse.ok) {
        throw new Error("The live Graph entry basis is unavailable.");
      }
      const brief = await briefResponse.json();
      const overlay = await overlayResponse.json();
      const focusNode = overlay.content.nodes.find(
        (node) =>
          node.layer === "current" &&
          node.object_kind === "claim" &&
          overlay.content.relationships.some(
            (relationship) =>
              relationship.source_node_key === node.node_key ||
              relationship.target_node_key === node.node_key,
          ),
      );
      if (focusNode === undefined) {
        throw new Error(
          "The live relationship overlay omitted a connected current Claim.",
        );
      }
      const focusRef = focusNode.owner.record_ref;
      const draft = scientificFocusedGraphEntryDraft({
        projectId: ${JSON.stringify(scientificProjectId)},
        question:
          "Which recorded downstream relationships concern this exact Claim?",
        focusRef,
        originKind: "brief",
        definitionRef: focusedGraphDefinitionRef(brief.content.definition),
        returnDestinationKind: "brief",
        returnDestinationOwner: "project_brief_view",
        returnLabel: "Brief focus",
        returnFocusId: "brief-focus",
      });
      return focusedGraphEntryPath({
        ...draft,
        request_id: createFocusedGraphRequestId(),
        return_context: {
          ...draft.return_context,
          path: ${JSON.stringify(`/projects/${scientificProjectId}/brief#brief-focus`)},
        },
      });
    })()`);
    assert.ok(graphEntryPath?.includes("graphEntry=1"));
    const entryUrl = new URL(graphEntryPath, workbench.url);
    const returnPath = entryUrl.searchParams.get("returnPath");
    const returnFocus = entryUrl.searchParams.get("returnFocus");
    assert.ok(returnPath?.includes(`/projects/${scientificProjectId}/brief`));
    assert.equal(returnFocus, "brief-focus");

    await navigate(
      graphEntryPath,
      'document.querySelector(".focused-graph-exploration") !== null && document.querySelector(".focused-graph-production-canvas")?.dataset.rendererState === "ready"',
      "registered scientific Graph expansion",
    );
    const initial = focusedCall();
    assert.equal(initial?.status, 200);
    assert.equal(initial?.json?.schema_version, "1.0.0");
    assert.equal(initial.requestJson.semantic_layer, "current");

    const recipe = await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-expansion-controls > label select");
      return {
        value: control?.value,
        labels: [...(control?.options ?? [])].map((option) => option.textContent.trim()),
      };
    })()`);
    assert.equal(recipe.value, "scientific.graph.show-downstream");
    assert.deepEqual(recipe.labels, ["Show downstream effects"]);

    const target = initial.json.content.nodes[0];
    assert.ok(target !== undefined, "The expansion target is not represented.");
    const selectedMeaning = "support";
    await evaluate(`(() => {
      const control = document.querySelector(".focused-graph-exploration__selection select");
      control.focus();
      control.value = ${JSON.stringify(target.node_key)};
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `document.querySelector(".focused-graph-exploration__selection select").value === ${JSON.stringify(target.node_key)}`,
      "exact Graph expansion target selection",
    );

    await evaluate(`(() => {
      const controls = [...document.querySelectorAll(".focused-graph-expansion-controls label")];
      for (const label of controls) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox === null) continue;
        const text = label.textContent.trim();
        const keep = [
          ${JSON.stringify("outgoing")},
          ${JSON.stringify("support")},
          ${JSON.stringify("canonical record")},
        ].includes(text);
        if (checkbox.checked !== keep) checkbox.click();
      }
      const depth = controls.find((label) => label.textContent.includes("Finite depth"))?.querySelector("select");
      depth.value = "3";
      depth.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await until(
      `(() => {
        const checked = [...document.querySelectorAll('.focused-graph-expansion-controls input[type="checkbox"]:checked')].map((input) => input.closest("label").textContent.trim()).sort();
        const depth = [...document.querySelectorAll(".focused-graph-expansion-controls label")].find((label) => label.textContent.includes("Finite depth"))?.querySelector("select")?.value;
        return JSON.stringify(checked) === JSON.stringify(${JSON.stringify(
          ["support", "canonical record", "outgoing"].sort(),
        )}) && depth === "3";
      })()`,
      "registered filters and finite depth",
    );

    const returnHrefBefore = await evaluate(
      `${link("Return to Brief focus")}.getAttribute("href")`,
    );
    await activate(button("Expand selected object"));
    await until(
      'document.querySelector(".focused-graph-expansion-summary") !== null && document.body.innerText.includes("Accepted Show downstream effects for the exact active snapshot")',
      "live registered expansion result",
    );

    const expansion = focusedCall();
    assert.equal(expansion?.status, 200);
    assert.equal(expansion?.json?.schema_version, "1.1.0");
    assert.equal(
      expansion.requestJson.exploration.recipe_semantic_key,
      "scientific.graph.show-downstream",
    );
    assert.deepEqual(
      expansion.requestJson.exploration.target_ref,
      target.record_ref,
    );
    assert.equal(expansion.requestJson.exploration.maximum_depth, 3);
    assert.deepEqual(expansion.requestJson.exploration.filters, {
      meaning_kinds: [selectedMeaning],
      directions: ["outgoing"],
      origins: ["canonical_record"],
    });
    assert.deepEqual(
      expansion.json.content.exploration.filters,
      expansion.requestJson.exploration.filters,
    );
    assert.equal(expansion.json.content.exploration.maximum_depth, 3);
    assert.ok(expansion.json.content.groups.length > 0);
    assert.ok(Array.isArray(expansion.json.content.scope.omissions));
    assert.ok(
      Object.values(expansion.json.content.exploration.accounting).every(
        (value) => value !== undefined,
      ),
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".focused-graph-exploration__selection select").value',
      ),
      target.node_key,
    );
    const summary = await evaluate(
      'document.querySelector(".focused-graph-expansion-summary").innerText',
    );
    for (const text of [
      "Show downstream effects",
      target.record_ref.record_id,
      "Normalized meanings",
      selectedMeaning,
      "Normalized directions",
      "outgoing",
      "Normalized origins",
      "canonical record",
      "Capped members",
      "Hidden relationships",
      "Restricted paths",
      "Cyclic paths",
      "Incomplete paths",
      "Unknown paths",
      "do not establish absence or completeness",
    ]) {
      assert.ok(summary.includes(text), `Expansion summary omitted ${text}.`);
    }
    assert.equal(
      await evaluate(
        'document.querySelectorAll(".focused-graph-expansion-summary__groups > li").length',
      ),
      expansion.json.content.groups.length,
    );
    const returnHrefAfter = await evaluate(
      `${link("Return to Brief focus")}.getAttribute("href")`,
    );
    assert.equal(returnHrefAfter, returnHrefBefore);
    assert.equal(returnHrefAfter, returnPath);

    await activate(link("Return to Brief focus"));
    await until(
      `window.location.pathname === ${JSON.stringify(`/projects/${scientificProjectId}/brief`)} && window.location.hash === ${JSON.stringify(`#${returnFocus}`)} && document.querySelector("#brief-focus") !== null`,
      "exact Brief return after expansion",
    );

    return {
      browser: {
        product: browser.product,
        user_agent: browser.userAgent,
        protocol_version: browser.protocolVersion,
      },
      route_transport:
        "production React Router and authenticated HTTP through the production server",
      project_id: scientificProjectId,
      entry: {
        path: entryUrl.pathname,
        origin: initial.requestJson.origin.origin_kind,
        return_path: returnPath,
        return_focus: returnFocus,
      },
      registration: {
        semantic_key: recipe.value,
        label: recipe.labels[0],
        contract: "petra.focused-graph-view@1.1.0",
      },
      request: {
        request_id: expansion.requestJson.request_id,
        target_ref: expansion.requestJson.exploration.target_ref,
        maximum_depth: expansion.requestJson.exploration.maximum_depth,
        filters: expansion.requestJson.exploration.filters,
      },
      response: {
        schema_name: expansion.json.schema_name,
        schema_version: expansion.json.schema_version,
        content_hash: expansion.json.content_hash,
        result_state:
          expansion.json.content.exploration.accounting.result_state,
        accounting: expansion.json.content.exploration.accounting,
        groups: expansion.json.content.groups.map((group) => ({
          group_key: group.group_key,
          label: group.label,
          returned_count: group.returned_count,
          filtered_count: group.filtered_count,
          hidden_count: group.hidden_count,
          coverage: group.coverage,
        })),
        omissions: expansion.json.content.scope.omissions,
      },
      interaction: {
        exact_target_selected: true,
        filters_changed: true,
        finite_depth_changed: true,
        selection_preserved: true,
        disclosure_rendered: true,
        exact_return_executed: true,
      },
    };
  };

  const inspectionUrls = () => {
    const route = (path) => new URL(path, workbench.url).href;
    return [
      {
        label: "Scientific project brief",
        url: route(`/projects/${scientificProjectId}/brief`),
      },
      {
        label: "Scientific focused graph",
        url: route(
          contextualGraphPath ??
            `/projects/${scientificProjectId}/graph?layer=working`,
        ),
      },
      {
        label: "Scientific review",
        url: route(
          `/projects/${scientificProjectId}/review/${scientificReviewSessionId}`,
        ),
      },
      {
        label: "Scientific history",
        url: route(`/projects/${scientificProjectId}/history`),
      },
      {
        label: "Controlled-writing review",
        url: route(
          `/projects/${writingProjectId}/review/${writingReviewSessionId}`,
        ),
      },
    ];
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.all([workbench.vite.close(), closeChrome({ chrome, cdp })]);
  };

  return {
    prepareReviewActionTarget,
    recordFocusedGraph,
    recordRegisteredGraphExpansion,
    recordProjectionLag,
    inspectionUrls,
    inspectionIndexUrl: () =>
      new URL("/__wave5-inspection", workbench.url).href,
    close,
  };
};

const windowlessLocation = (call) => {
  const request = call.requestJson;
  const params = new URLSearchParams({
    graphEntry: "1",
    requestId: request.request_id,
    question: request.question,
    focusId: request.focus_ref.record_id,
    focusRevision: String(request.focus_ref.revision),
    focusHash: request.focus_ref.record_hash,
    origin: request.origin.origin_kind,
    definitionId: request.project_definition_ref.project_definition_id,
    definitionRevision: String(request.project_definition_ref.revision),
    definitionHash: request.project_definition_ref.content_hash,
    definitionRecordHash: request.project_definition_ref.record_hash,
    definitionFamily: request.project_definition_ref.definition_family,
    taskSemanticKey: request.task_semantic_key,
    objectSemanticKey: request.object_semantic_key,
    relationshipSemanticKey: request.relationship_semantic_key,
    returnActionSemanticKey: request.return_action_semantic_key,
    returnDestinationKey: request.return_destination.destination_key,
    returnDestinationKind: request.return_destination.destination_kind,
    returnDestinationOwner: request.return_destination.owner,
    returnDestinationLabel: request.return_destination.label,
    returnDestinationState: request.return_destination.state,
    returnTargetId: request.return_destination.target_ref.record_id,
    returnTargetRevision: String(
      request.return_destination.target_ref.revision,
    ),
    returnTargetHash: request.return_destination.target_ref.record_hash,
    semanticLayer: request.semantic_layer,
    presentation: "position",
    maximumDepth: String(request.limits.maximum_depth),
    maximumNodes: String(request.limits.maximum_nodes),
    maximumRelationships: String(request.limits.maximum_relationships),
    maximumPaths: String(request.limits.maximum_paths),
    returnPath: `/projects/${call.json.project_id}/review`,
    returnLabel: "Review",
  });
  if (request.origin.origin_ref !== undefined) {
    params.set("originRefId", request.origin.origin_ref.record_id);
    params.set("originRefRevision", String(request.origin.origin_ref.revision));
    params.set("originRefHash", request.origin.origin_ref.record_hash);
  }
  return `/projects/${call.json.project_id}/graph?${params}`;
};
