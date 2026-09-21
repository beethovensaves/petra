import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import { startWave5CumulativeBrowser } from "./wave5-cumulative-browser-driver.mjs";

const operationIds = [
  "graph.open",
  "graph.return",
  "graph.layer-position",
  "graph.select",
  "graph.open-details",
  "graph.open-source",
  "graph.expand",
  "graph.filter",
  "graph.save-question",
  "graph.compare",
  "graph.impact",
  "graph.time",
  "graph.correct-through-review",
  "details.open",
  "details.return",
];

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = process.env.PETRA_WAVE6_GRAPH_DETAILS_BROWSER_OUTPUT?.trim();
  assert.ok(
    output,
    "The Wave 6 Graph/Details observer requires an output path.",
  );
  let browser;
  let correctionTarget;
  let observation;
  let observerFailure;
  let closed = false;

  const requireBrowser = async (context) => {
    if (browser !== undefined) return browser;
    browser = await startWave5CumulativeBrowser({
      root,
      getBackendUrl: () => context.backendUrl,
      scientificProjectId: context.scientificProjectId,
      scientificReviewSessionId: context.scientificReviewSessionId,
      writingProjectId: context.writingProjectId,
      writingReviewSessionId: context.writingReviewSessionId,
    });
    return browser;
  };

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
    assert.equal(
      response.status,
      200,
      "The Graph scenario Review read failed.",
    );
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.ok(
      session && selected,
      "The Graph scenario Review is not actionable.",
    );
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
      if (stage === "refreshed_paired_profile") {
        correctionTarget = await (
          await requireBrowser(context)
        ).prepareReviewActionTarget();
        return undefined;
      }
      if (stage === "projection_lag") {
        const applied = await prepareAndApply(
          context,
          context.scientificReviewSessionId,
        );
        observation = await (
          await requireBrowser(context)
        ).recordFocusedGraph({ saveExactQuestion: true });
        return applied;
      }
      if (stage === "governed_command_failure") {
        return prepareAndApply(
          context,
          context.failureReviewSessionId,
          context.advanceAuthority,
        );
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
      await browser?.close();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.ok(
        observation,
        "The complete live Graph/Details path was not recorded.",
      );
      assert.ok(
        correctionTarget,
        "The governed Review correction target was not recorded.",
      );
      assert.ok(
        observation.inquiry_save?.applied === true,
        "The exact Graph question was not durably saved.",
      );
      const artifact = {
        schema_name: "petra.wave6-graph-details-browser-observation",
        schema_version: "1.0.0",
        status: "passed",
        recorded_at: new Date().toISOString(),
        command:
          "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:graph-details-ui",
        environment: {
          node: process.versions.node,
          browser: observation.browser,
          workbench:
            "production React Router loaders, Focused Graph components, Cytoscape renderer, textual peer, Details, and Review preview",
          transport: "authenticated live HTTP",
          persistence: "fresh disposable PostgreSQL and Neo4j",
        },
        operation_ids: operationIds,
        correction_target: correctionTarget,
        observation,
        scenario_records: [
          {
            evidence_id: "UX1.6-GRAPH",
            scenario_id: "task-graph-details-return",
            status: "passed",
            boundary:
              "Isolated Chrome executed contextual and direct production Graph entry; Current, Working changes, and exact retained Historical positions; exact relationship selection; synchronized Details and available SourceSpan disclosure; production Cytoscape/text parity; registered expansion with changed filters and finite depth; local bookmark plus durable Project-question save; server-supplied comparison, impact, and recorded-time analysis; governed correction preview through the exact open Review member; Details focus return; and exact return to the originating Review task and focus. Authenticated live HTTP reached production owners over fresh disposable PostgreSQL and Neo4j; renderer and presentation state supplied no authority.",
          },
        ],
        boundary: {
          browser:
            "The retained scenario used visible production controls in isolated headless Chrome at one stable workbench URL.",
          transport:
            "Every Graph, Details, source, analysis, correction-preview, and save read or command used authenticated live production HTTP.",
          persistence:
            "Fresh disposable PostgreSQL supplied authority and durable Project-question state; fresh Neo4j supplied the rebuildable graph projection.",
          authority:
            "Selection, layout, filtering, bookmarks, and renderer geometry remained presentation state. The correction was read-only; the only scenario mutation was the explicit server-owned Project-question save.",
        },
        limitations: [
          "This focused record does not claim the complete Review decision workflow, guided core path, responsive/accessibility review, adverse-state matrix, operations gate, critic audit, exit gate, final recording, or user acceptance.",
          "The exact source basis was available in the representative scientific Project; unavailable-source recovery remains covered by separate focused tests and is not relabeled as this successful scenario.",
        ],
      };
      writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
