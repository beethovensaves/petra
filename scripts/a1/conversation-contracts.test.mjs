import test from "node:test";
import { runVitest } from "./run-vitest.mjs";
test("FE-A1.3-W01-AC01 execution: registered ordinary questions follow-ups and intake execute", () => {
  runVitest(
    "@petra/core",
    ["project-copilot-conversation.test.ts", "intake-copilot.test.ts"],
    "answers a normal question|retains the exact prepared input before invocation",
    2,
  );
});
test("FE-A1.3-W01-AC02 execution: the certified M1 question keeps its original guarded route", () => {
  runVitest(
    "@petra/server",
    ["m1-grounded-synthesis.test.ts"],
    "loads the recorded certification and executes it through Petra",
    1,
  );
});
test("FE-A1.3-W01-AC03 execution: role output grounding budgets and eligibility remain explicit", () => {
  runVitest(
    "@petra/contracts",
    ["copilot-human-command-decision.test.ts"],
    "execution:",
    2,
  );
  runVitest(
    "@petra/core",
    ["project-copilot.test.ts"],
    "binds empty native Project context|allows exact admitted excerpts",
    2,
  );
  runVitest(
    "@petra/adapters",
    ["project-copilot.test.ts"],
    "requires exact certification|projects provider-compatible required fields",
    2,
  );
});
