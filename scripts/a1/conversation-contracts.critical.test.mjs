import test from "node:test";
import { runVitest } from "./run-vitest.mjs";
test("FE-A1.3-W01-AC01 critical: hashed foreign context and fabricated intake evidence are rejected", () => {
  runVitest(
    "@petra/core",
    [
      "project-copilot-conversation.test.ts",
      "project-copilot.test.ts",
      "intake-copilot.test.ts",
    ],
    "rejects another Project|rejects cross-Project|rejects invented source reports",
    3,
  );
});
test("FE-A1.3-W01-AC02 critical: editing the fixed synthesis question cannot borrow its authority", () => {
  runVitest(
    "@petra/server",
    ["m1-grounded-synthesis.test.ts"],
    "refuses unsupported questions before a provider turn",
    1,
  );
});
test("FE-A1.3-W01-AC03 critical: tool activity model substitution and invented source wording fail", () => {
  runVitest(
    "@petra/server",
    ["project-copilot-eligibility.test.ts"],
    "withholds a changed deployed copilot",
    1,
  );
  runVitest(
    "@petra/adapters",
    ["project-copilot.test.ts"],
    "rejects tool activity|rejects model substitution",
    2,
  );
  runVitest(
    "@petra/core",
    ["project-copilot.test.ts"],
    "rejects uncited source reports|rejects unsupported authoritative language",
    2,
  );
});
