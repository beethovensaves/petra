import test from "node:test";
import { runBrowser } from "./run-browser.mjs";
import { runVitest } from "./run-vitest.mjs";
test("FE-A1.3-W02-AC01 critical: model access cannot acquire invented previews basis or authority edits", () => {
  runVitest(
    "@petra/core",
    ["copilot-working-plan.test.ts"],
    "rejects fabricated preview|rejects protected authority|rejects partial JSON",
    3,
  );
  runVitest(
    "@petra/adapters",
    ["copilot-working-plan.test.ts"],
    "rejects forbidden tool|rejects invalid preview context",
    2,
  );
});
test("FE-A1.3-W02-AC02 critical: actual unavailable readiness preserves a draft through a new browser document", () => {
  runBrowser(
    "apps/workbench/test/a1-model-unavailable-browser.mjs",
    "Actual readiness failure preserved the question and prevented invocation.",
  );
});
test("FE-A1.3-W02-AC03 critical: stale deployment and another role certificate cannot borrow eligibility", () => {
  runVitest(
    "@petra/server",
    [
      "copilot-working-plan-model.test.ts",
      "copilot-working-plan-routes.test.ts",
    ],
    "withholds a changed working|does not borrow|does not disclose a role",
    3,
  );
  runVitest(
    "@petra/adapters",
    ["copilot-working-plan.test.ts"],
    "refuses an advisory or fixed-prompt certificate",
    1,
  );
});
