import assert from "node:assert/strict";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave6SourcesLifecycleBrowser } from "./wave6-sources-lifecycle-browser-driver.mjs";

export const createWave4EvidenceObserver = async ({ root }) => {
  let browser;
  let observation;
  let observerFailure;
  let closed = false;

  const readReviewSelection = async ({
    backendUrl,
    token,
    projectId,
    reviewSessionId,
  }) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${projectId}/reviews/${reviewSessionId}`,
        backendUrl,
      ),
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(response.status, 200);
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.ok(session && selected);
    return {
      project_id: projectId,
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
      await readReviewSelection({
        backendUrl: context.backendUrl,
        token: context.token,
        projectId: context.scientificProjectId,
        reviewSessionId,
      }),
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
        assert.ok(
          context.wave6SourcesScenario,
          "The Sources lifecycle fixtures were not supplied.",
        );
        browser = await startWave6SourcesLifecycleBrowser({
          root,
          getBackendUrl: () => context.backendUrl,
          scenario: context.wave6SourcesScenario,
        });
        observation = browser.observation;
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
      await browser?.close?.();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.ok(observation, "The live Sources lifecycle was not recorded.");
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
