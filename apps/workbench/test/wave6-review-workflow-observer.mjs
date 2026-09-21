import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave6ReviewWorkflowBrowser } from "./wave6-review-workflow-browser-driver.mjs";

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = process.env.PETRA_WAVE6_REVIEW_OUTPUT?.trim();
  assert.ok(output, "The Wave 6 Review observer requires an output path.");
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
          context.wave6ReviewScenario,
          "The Review workflow fixtures were not supplied.",
        );
        browser = await startWave6ReviewWorkflowBrowser({
          root,
          getBackendUrl: () => context.backendUrl,
          projectId: context.scientificProjectId,
          scenario: context.wave6ReviewScenario,
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
      assert.ok(observation, "The live Review workflow was not recorded.");
      const artifact = {
        schema_name: "petra.wave6-review-workflow-browser-observation",
        schema_version: "1.0.0",
        status: "passed",
        recorded_at: new Date().toISOString(),
        command:
          "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:review-ui",
        environment: {
          node: process.versions.node,
          browser: observation.browser,
          workbench:
            "production React Router loaders, Review components, and command clients",
          transport: "authenticated live HTTP",
          persistence: "fresh disposable PostgreSQL",
        },
        observation,
        scenario_records: [
          {
            evidence_id: "UX1.6-REVIEW",
            scenario_id: "correct-reject-defer-apply",
            status: "passed",
            boundary:
              "Isolated Chrome executed the production Review queue, routes, visible controls, typed clients, authenticated live HTTP owners, and disposable PostgreSQL state for candidate correction, basis revision, member selection and separation, rejection, defer/reopen, stale refresh, exact ChangeSet preparation, Apply, member outcomes, and exact Work return. Purpose-built disposable Review records isolate incompatible decisions; no fixture response or client-owned authority substitutes for a production command.",
          },
        ],
        limitations: [
          "The retained workbench URL is stable for this isolated execution but is not the final long-lived USER-TESTABLE-01 URL.",
          "This focused record does not claim the complete guided-core-path, responsive-accessibility, adverse-state, Graph, Source, History, operations, critic, exit, or user-acceptance scenarios.",
          "The candidate and basis revision intentionally remain non-authoritative pending validation; Apply and Reject execute on distinct validation-passed Review records because those decisions are mutually exclusive.",
        ],
      };
      writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
