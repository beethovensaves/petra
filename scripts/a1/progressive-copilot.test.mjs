import test from "node:test";
import assert from "node:assert/strict";
import { runVitest } from "./run-vitest.mjs";
import { runBrowser } from "./run-browser.mjs";
import { inspectPresentationBoundary } from "./presentation-boundary.mjs";
test("FE-A1.3-W05-AC01 execution: actual managed conversation visibly discloses owned blocks through one official SDK request", () => {
  runVitest(
    "@petra/adapters",
    ["copilot-progress.test.ts"],
    "uses one official SDK",
    1,
  );
  runBrowser(
    "apps/workbench/test/a1-progressive-copilot-browser.mjs",
    "Actual managed-model progressive disclosure and canonical Work inspection passed.",
  );
});
test("FE-A1.3-W05-AC02 execution: disclosure and native custom events use closed registered version and authority profiles", () => {
  runVitest(
    "@petra/adapters",
    ["copilot-progress.test.ts"],
    "rejects an unsupported activity",
    1,
  );
});
test("FE-A1.3-W05-AC03 execution: Core and feature components consume typed business presentations without SDK protocol interpretation", () => {
  assert.deepEqual(inspectPresentationBoundary(), []);
});
