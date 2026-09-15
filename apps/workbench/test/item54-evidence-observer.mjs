import assert from "node:assert/strict";

import { startItem50ProductionBrowser } from "./item50-production-browser-driver.mjs";

const progress = (message) =>
  process.stderr.write(`[wave4-item54-browser] ${message}\n`);

export const createWave4EvidenceObserver = async ({ root }) => {
  let backendUrl;
  let browser;
  let failureReviewSessionId;
  let closed = false;
  const retained = {
    external_model_call_executed: false,
    provider_evidence_owner:
      "reports/WAVE4-NATURAL-CONVERSATION-MODEL-IDENTITY-TRACE.md",
    scenarios: {},
  };

  const requireBrowser = async (context) => {
    backendUrl = context.backendUrl;
    if (browser !== undefined) return browser;
    assert.equal(
      context.publishedItem49.reviewSessionId,
      context.scientificReviewSessionId,
    );
    browser = await startItem50ProductionBrowser({
      root,
      getBackendUrl: () => backendUrl,
      scientificProjectId: context.scientificProjectId,
      writingProjectId: context.writingProjectId,
      scientificReviewSessionId: context.scientificReviewSessionId,
      writingReviewSessionId: context.writingReviewSessionId,
    });
    return browser;
  };

  const record = async (stage, context) => {
    const activeBrowser = await requireBrowser(context);
    if (stage === "corrected_blocked_limited_basis") {
      const result = await activeBrowser.recordConversationAndBlockedCorrection(
        {
          ...context,
          modelCallId: context.publishedItem49.extractorModelCallId,
        },
      );
      retained.scenarios.paired_profile_natural_conversation = {
        thread_view_hash: result.thread_view_hash,
        overlay_hash: result.overlay_hash,
        model_actor_id: result.model_actor_id,
        model_call_id: result.model_call_id,
      };
      retained.scenarios.corrected_blocked_review = {
        review_hash: result.corrected_review_hash,
        blocked_reason: result.blocked_reason,
        recovery: result.recovery,
      };
      retained.scenarios.limited_basis_review = {
        review_hash: result.corrected_review_hash,
        limitation: result.limitation,
      };
      progress(
        "recorded natural conversation plus corrected, blocked, and limited-basis Review",
      );
      return result;
    }
    if (stage === "stale_before_refresh") {
      const result = await activeBrowser.recordStaleReview();
      retained.scenarios.stale_review_before_refresh = result;
      progress("recorded stale Review before refresh");
      return result;
    }
    if (stage === "refreshed_paired_profile") {
      const result =
        await activeBrowser.recordRefreshedAndWritingReview(context);
      retained.scenarios.paired_profile_natural_conversation = {
        ...retained.scenarios.paired_profile_natural_conversation,
        refreshed_scientific_review_hash: result.refreshed_review_hash,
        controlled_writing_review_hash: result.writing_review_hash,
        controlled_writing_candidate_label: result.writing_candidate_label,
        controlled_writing_basis_label: result.writing_basis_label,
        controlled_writing_relationship_label:
          result.writing_relationship_label,
      };
      progress(
        "recorded refreshed scientific and controlled-writing Review presentations",
      );
      return result;
    }
    if (stage === "projection_lag") {
      const result = await activeBrowser.applyDisplayedChangeSet({
        expectedModelActorId: context.publishedItem49.modelActorId,
        expectedModelCallId: context.publishedItem49.extractorModelCallId,
      });
      retained.scenarios.projection_lag = {
        displayed_commitment_hash:
          result.request.checkpoint.displayed_commitment_hash,
        change_set_id:
          result.request.checkpoint.binding.change_set.change_set_id,
        outcome: result.result.outcome,
        projection_state:
          result.result.assessment.content.review.projection.state,
        pending_records:
          result.result.assessment.content.review.projection.pending_records,
      };
      progress("recorded the explicit human Apply and honest projection lag");
      return result;
    }
    if (stage === "governed_command_failure") {
      failureReviewSessionId = context.failureReviewSessionId;
      const result = await activeBrowser.recordGovernedCommandFailure(context);
      retained.scenarios.governed_command_failure_recovery = {
        review_session_id: context.failureReviewSessionId,
        displayed_commitment_hash:
          result.request.checkpoint.displayed_commitment_hash,
        outcome: result.result.outcome,
        error_code: result.result.steps[0]?.error_code,
        step_observations: result.result.steps.map((step) => step.observation),
        preservation_records:
          result.result.assessment.content.preservation.length,
      };
      progress(
        "recorded governed command failure, preserved state, and recovery",
      );
      return result;
    }
    if (stage === "restart_complete") {
      assert.notEqual(failureReviewSessionId, undefined);
      const result = await activeBrowser.recordRestartedEvidence({
        ...context,
        failureReviewSessionId,
      });
      retained.restart = result;
      progress("recorded post-restart live Review reads");
      return result;
    }
    throw new Error(`Unsupported Wave 4 evidence stage: ${stage}`);
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      if (browser !== undefined) await browser.close();
    } finally {
      progress(`retained evidence ${JSON.stringify(retained)}`);
    }
  };

  return { record, close };
};
