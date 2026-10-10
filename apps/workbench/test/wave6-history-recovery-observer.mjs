import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave6HistoryRecoveryBrowser } from "./wave6-history-recovery-browser-driver.mjs";

const operationIds = [
  "brief.recent-decisions",
  "history.list",
  "history.filter",
  "history.open",
  "history.compare",
  "history.impact",
  "history.preview-revert",
  "history.execute-revert",
];

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = process.env.PETRA_WAVE6_HISTORY_BROWSER_OUTPUT?.trim();
  assert.ok(output, "The Wave 6 History observer requires an output path.");
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
        browser = await startWave6HistoryRecoveryBrowser({
          root,
          getBackendUrl: () => context.backendUrl,
          projectId: context.scientificProjectId,
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
      assert.ok(observation, "The live History workflow was not recorded.");
      const artifact = {
        schema_name: "petra.wave6-history-recovery-browser-observation",
        schema_version: "1.0.0",
        status: "passed",
        recorded_at: new Date().toISOString(),
        command:
          process.env.PETRA_EVIDENCE_COMMAND ??
          "node scripts/test-wave4-cumulative-integration.mjs",
        environment: {
          node: process.versions.node,
          browser: observation.browser,
          workbench:
            "production React Router Brief, retained History, exact event, impact, recovery, and governed-Revert components",
          transport: "authenticated live HTTP",
          persistence: "fresh disposable PostgreSQL",
        },
        operation_ids: operationIds,
        observation,
        scenario_records: [
          {
            evidence_id: "UX1.6-HISTORY",
            scenario_id: "effect-recovery-revert-return",
            status: "passed",
            boundary:
              "Isolated Chrome opened the production Brief recent-decision area, entered authenticated retained Project History, applied one exact seven-dimension filter through visible controls, opened the selected immutable event, followed the Agent's Inspect action into the unified Workspace inspection of the exact event, impact, receipt, and recovery, and returned to that event. It then expanded the retained historical comparison and current impact/recovery assessment, read the governed-Revert preview, supplied and confirmed the reason and Approval rationale, executed the exact server-composed compensation plan once, observed the additive result, verified both original and compensation events in retained History, and returned to the updated Brief. Authenticated live HTTP reached production readers and commands over fresh disposable PostgreSQL; the client supplied no authority and no fixture response substituted for the workflow.",
          },
        ],
        boundary: {
          browser:
            "The complete named scenario used visible production controls in isolated headless Chrome at one stable workbench URL.",
          transport:
            "Every Brief, retained collection, event, impact, recovery, preview, plan, execution, and final return read or command used authenticated live production HTTP.",
          persistence:
            "Fresh disposable PostgreSQL supplied authority, retained the original event and additive compensation, and served the updated Brief.",
          authority:
            "Filters and disclosure state remained presentation concerns. Historical interpretation, impact, recovery eligibility, preview, plan, authorization, execution, effects, and History retention remained server-owned.",
        },
        limitations: [
          "The retained workbench URL is stable for this isolated execution but is not the final long-lived USER-TESTABLE-01 URL.",
          "This focused record does not claim the complete guided core path, taxonomy, responsive/accessibility review, adverse-state matrix, operations gate, critic audit, exit gate, final recording, or user acceptance.",
          "The scenario executed one currently eligible single-ChangeSet governed Revert; other History families remain visible and filterable but were not mutated by this trace.",
        ],
      };
      writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
