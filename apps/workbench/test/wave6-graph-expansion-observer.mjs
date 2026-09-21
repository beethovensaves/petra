import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave5CumulativeBrowser } from "./wave5-cumulative-browser-driver.mjs";

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = process.env.PETRA_WAVE6_GRAPH_EXPANSION_OUTPUT?.trim();
  assert.ok(
    output,
    "The Wave 6 Graph expansion observer requires an output path.",
  );
  let backendUrl;
  let token;
  let scientificProjectId;
  let scientificReviewSessionId;
  let browser;
  let correctionPreview;
  let observation;
  let observerFailure;
  let closed = false;

  const readReviewSelection = async (reviewSessionId) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${scientificProjectId}/reviews/${reviewSessionId}`,
        backendUrl,
      ),
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(response.status, 200, "The Graph trace Review read failed.");
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.equal(review?.project_id, scientificProjectId);
    assert.ok(session && selected, "The Graph trace Review is not actionable.");
    return {
      project_id: scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    };
  };

  const prepareAndApply = async (reviewSessionId, beforeApply) => {
    const client = new ReviewSessionApplyClient({ baseUrl: backendUrl, token });
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

  const requireBrowser = async (context) => {
    if (browser !== undefined) return browser;
    browser = await startWave5CumulativeBrowser({
      root,
      getBackendUrl: () => backendUrl,
      scientificProjectId: context.scientificProjectId,
      scientificReviewSessionId: context.scientificReviewSessionId,
      writingProjectId: context.writingProjectId,
      writingReviewSessionId: context.writingReviewSessionId,
    });
    return browser;
  };

  const record = async (stage, context) => {
    try {
      backendUrl = context.backendUrl;
      token = context.token;
      scientificProjectId = context.scientificProjectId;
      scientificReviewSessionId = context.scientificReviewSessionId;
      if (stage === "refreshed_paired_profile") {
        const liveBrowser = await requireBrowser(context);
        correctionPreview = await liveBrowser.prepareReviewActionTarget();
        observation = await liveBrowser.recordRegisteredGraphExpansion();
        return undefined;
      }
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
        stage === "restart_complete"
      ) {
        return undefined;
      }
      throw new Error(`Unsupported Wave 6 Graph trace stage: ${stage}`);
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
      await browser?.close();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.ok(observation, "The live Graph expansion was not recorded.");
      assert.ok(
        correctionPreview,
        "The live Review-to-Graph correction preview was not recorded.",
      );
      const artifact = {
        schema_name: "petra.wave6-graph-expansion-browser-observation",
        schema_version: "1.0.0",
        status: "passed",
        recorded_at: new Date().toISOString(),
        command:
          "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:graph-ui",
        correction_preview: correctionPreview.correction_preview,
        ...observation,
        boundary: {
          browser:
            "Isolated headless Chrome executed the production workbench route and controls.",
          transport:
            "Authenticated live HTTP reached the production focused-graph query owner.",
          persistence:
            "Fresh disposable PostgreSQL and Neo4j stores supplied exact authority and projection state.",
          authority:
            "Correction preview, expansion, and filtering remained read-only; renderer state did not enter either request and no command was issued.",
        },
        limitations: [
          "This focused operation trace does not claim the complete UX1.6-GRAPH/task-graph-details-return scenario.",
          "The correction-preview segment proves exact Review-to-Graph composition and return but does not claim the complete UX1.6-REVIEW/correct-reject-defer-apply scenario.",
          "The trace covers the representative scientific profile registration and does not repeat paired-profile or unsupported-profile evidence.",
        ],
      };
      writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
