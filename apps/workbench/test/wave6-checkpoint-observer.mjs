import assert from "node:assert/strict";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWorkbench } from "./cumulative-production-browser-driver.mjs";

const checkpointPort = 4311;

export const createWave4EvidenceObserver = async ({ root }) => {
  let backendUrl;
  let token;
  let scientificProjectId;
  let scientificReviewSessionId;
  let workbench;
  let closed = false;
  let observerFailure;

  const readReviewSelection = async (reviewSessionId) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${scientificProjectId}/reviews/${reviewSessionId}`,
        backendUrl,
      ),
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(response.status, 200, "The checkpoint Review read failed.");
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.equal(
      review?.project_id,
      scientificProjectId,
      "The checkpoint Review crossed the Project boundary.",
    );
    assert.ok(session && selected, "The checkpoint Review is not actionable.");
    return {
      project_id: scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    };
  };

  const prepareAndApply = async (reviewSessionId, beforeApply) => {
    const client = new ReviewSessionApplyClient({
      baseUrl: backendUrl,
      token,
    });
    const checkpoint = await client.prepare(
      await readReviewSelection(reviewSessionId),
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

  const startCheckpoint = async () => {
    if (workbench !== undefined) return workbench;
    workbench = await startWorkbench({
      root,
      getBackendUrl: () => backendUrl,
      calls: [],
      port: checkpointPort,
      strictPort: true,
    });
    assert.equal(workbench.url, `http://127.0.0.1:${checkpointPort}`);
    return workbench;
  };

  const record = async (stage, context) => {
    try {
      backendUrl = context.backendUrl;
      token = context.token;
      scientificProjectId = context.scientificProjectId;
      scientificReviewSessionId = context.scientificReviewSessionId;
      if (stage === "refreshed_paired_profile") await startCheckpoint();
      if (stage === "projection_lag") {
        return prepareAndApply(scientificReviewSessionId);
      }
      if (stage === "governed_command_failure") {
        return prepareAndApply(
          context.failureReviewSessionId,
          context.advanceAuthority,
        );
      }
      if (
        stage === "corrected_blocked_limited_basis" ||
        stage === "stale_before_refresh" ||
        stage === "refreshed_paired_profile" ||
        stage === "restart_complete"
      ) {
        return undefined;
      }
      throw new Error(`Unsupported Wave 6 checkpoint stage: ${stage}`);
    } catch (error) {
      observerFailure = error;
      throw error;
    }
  };

  const waitForTester = async () => {
    assert.ok(
      workbench !== undefined,
      "The Wave 6 checkpoint workbench did not start.",
    );
    process.stdout.write(
      `\nWave 6 first user-testable checkpoint is ready.\n\nOpen the in-product guide:\n  ${workbench.url}/guide\n\nThe guide names the representative Project, expected outcomes, safe mutations, reset control, and current limits. Press Enter here when you are finished; Petra will then remove the disposable data and services.\n`,
    );

    await new Promise((resolveStop) => {
      const canReadInput = process.stdin.isTTY === true;
      const stop = () => {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
        if (canReadInput) {
          process.stdin.removeListener("data", stop);
          process.stdin.pause();
        }
        resolveStop();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      if (canReadInput) {
        process.stdin.setEncoding("utf8");
        process.stdin.resume();
        process.stdin.once("data", stop);
      } else {
        process.stdout.write(
          "No interactive terminal is attached; send SIGINT or SIGTERM to stop the checkpoint.\n",
        );
      }
    });
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    let failure;
    try {
      if (observerFailure === undefined) await waitForTester();
    } catch (error) {
      failure = error;
    }
    try {
      await workbench?.vite.close();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
