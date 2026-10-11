import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
import { runBrowser } from "./run-browser.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.2-W01-AC01 execution: scientific writing and unrelated outcomes share production drafting and exact kernel creation", () => {
  runVitest(
    "@petra/postgres",
    ["project-profile-runtime.test.ts"],
    "creates scientific, writing, and unrelated Projects",
    1,
  );
  runBrowser(
    "apps/workbench/test/a1-outcome-drafting-browser.mjs",
    "Outcome-first drafting for all three outcome types and explicit assumption review passed.",
  );
});
test("FE-A1.2-W01-AC02 execution: changed draft content and unaccepted assumptions create no Project", () => {
  runVitest(
    "@petra/postgres",
    ["project-profile-runtime.test.ts"],
    "rejects a changed draft and unaccepted assumptions",
    1,
  );
});
test("FE-A1.2-W01-AC03 execution: the outcome form treats registered examples as optional", () => {
  runVitest(
    "@petra/workbench",
    ["project-profile.test.tsx"],
    "starts from an agnostic outcome",
    1,
  );
});
