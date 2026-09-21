import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave6ReviewWorkflowBrowser } from "./wave6-actions-feedback-browser-driver.mjs";

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
      process.stderr.write(
        `[wave6-actions-feedback-browser] ${error instanceof Error ? error.stack : String(error)}\n`,
      );
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
        schema_name: "petra.wave6-actions-feedback-browser-observation",
        schema_version: "1.0.0",
        status: "passed",
        recorded_at: new Date().toISOString(),
        command:
          "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:actions-feedback-ui",
        environment: {
          node: process.versions.node,
          browser: observation.browser,
          workbench:
            "production React Router loaders, product components, and command clients",
          transport: "authenticated live HTTP",
          persistence: "fresh disposable PostgreSQL",
        },
        observation,
        scenario_records: [
          {
            evidence_id: "UX1.6-ACTIONS",
            scenario_id: "suggested-action-interrupt-review",
            status: "passed",
            boundary:
              "One isolated Chrome session executed the production Brief, Petra, Work, and Review routes at one stable workbench URL against authenticated live HTTP owners, a certified grounded-synthesis runtime, ArtifactStore bytes, and fresh disposable PostgreSQL. It previewed and invoked the same registered SuggestedAction in both direct and Petra presentations; confirmed the exact consequence; retained byte-equivalent commands across deliberately interrupted response delivery; exercised explicit retry, transient dismissal, and focus return; replayed and resolved a PostgreSQL-backed durable Review interrupt; corrected Review text and basis; visibly refreshed and applied a separate prevalidated exact Review; and returned to the originating Work. Purpose-built disposable records isolate correction from the independently eligible decision; no fixture response, hidden developer command, or client-owned authority substitutes for a production command.",
          },
        ],
        limitations: [
          "The retained workbench URL is stable for this isolated execution but stops when the test completes and is not the final long-lived USER-TESTABLE-01 URL.",
          "This focused record does not claim the complete guided-core-path, responsive-accessibility, adverse-state, Graph, Source, History, operations, critic, exit, or user-acceptance scenarios.",
          "The corrected candidate and basis intentionally remain non-authoritative pending validation; Apply executes on a distinct validation-passed Review record.",
        ],
      };
      writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
