import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createWave4EvidenceObserver as createBaseObserver } from "./item54-evidence-observer.mjs";
import { startWave5CumulativeBrowser } from "./wave5-cumulative-browser-driver.mjs";

export const createWave4EvidenceObserver = async ({ root }) => {
  const base = await createBaseObserver({ root });
  const output = process.env.PETRA_WAVE5_BROWSER_OBSERVER_OUTPUT?.trim();
  assert.ok(output, "Wave 5 browser observer requires an output path.");
  let backendUrl;
  let browser;
  let closed = false;
  let observerFailure;
  const retained = {
    schema_name: "petra.wave5-live-browser-observation",
    schema_version: "1.0.0",
    status: "passed",
    route_boundary:
      "Production React Router loaders and controllers in isolated headless Chrome over authenticated live server routes backed by the disposable PostgreSQL and Neo4j stores.",
  };

  const requireBrowser = async (context) => {
    backendUrl = context.backendUrl;
    if (browser !== undefined) return browser;
    browser = await startWave5CumulativeBrowser({
      root,
      getBackendUrl: () => backendUrl,
      scientificProjectId: context.scientificProjectId,
      scientificReviewSessionId: context.scientificReviewSessionId,
    });
    return browser;
  };

  const record = async (stage, context) => {
    try {
      backendUrl = context.backendUrl;
      const baseResult =
        stage === "restart_complete"
          ? undefined
          : await base.record(stage, context);
      if (stage === "refreshed_paired_profile") {
        retained.pre_apply_review_target = await (
          await requireBrowser(context)
        ).prepareReviewActionTarget();
      }
      if (stage === "projection_lag") {
        retained.focused_graph = await (
          await requireBrowser(context)
        ).recordFocusedGraph();
        retained.projection_lag = await (
          await requireBrowser(context)
        ).recordProjectionLag();
      }
      return baseResult;
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
      await base.close?.();
    } catch (error) {
      failure = error;
    }
    try {
      await browser?.close();
    } catch (error) {
      if (failure === undefined) failure = error;
    }
    if (failure === undefined) {
      assert.ok(retained.focused_graph, "Live focused Graph was not recorded.");
      assert.ok(
        retained.pre_apply_review_target,
        "Pre-Apply Review correction target was not recorded.",
      );
      assert.ok(retained.projection_lag, "Projection lag was not recorded.");
      writeFileSync(
        resolve(output),
        `${JSON.stringify({ ...retained, recorded_at: new Date().toISOString() }, null, 2)}\n`,
      );
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
