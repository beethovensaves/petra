import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
import { runBrowser } from "./run-browser.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.2-W07-AC01 execution: exact scientific writing and unrelated definitions load through one shell and actual immutable reads", () => {
  runVitest(
    "@petra/core",
    ["project-definition-components.test.ts"],
    "resolves scientific and writing",
    1,
  );
  runVitest(
    "@petra/workbench",
    ["project-definition-components.test.tsx"],
    "renders scientific writing|loads the actual writing",
    2,
  );
  runVitest(
    "@petra/server",
    ["project-definition-routes.test.ts"],
    "reads the exact retained",
    1,
  );
  runVitest(
    "@petra/adapters",
    ["project-definition-client.test.ts"],
    "requests one authenticated",
    1,
  );
  runBrowser(
    "apps/workbench/test/a1-definition-components-browser.mjs",
    "Exact definition components loaded in the production browser without an authority effect.",
  );
});
test("FE-A1.2-W07-AC02 execution: every registered capability resolves its exact schema separately from installed execution", () => {
  runVitest(
    "@petra/core",
    ["project-definition-components.test.ts"],
    "resolves every declared category",
    1,
  );
});
test("FE-A1.2-W07-AC03 execution: actual immutable definition revisions preserve exact historical objectives and bindings", () => {
  runVitest(
    "@petra/postgres",
    ["project-definition-authority-repository.test.ts"],
    "retains definition and objective revisions",
    1,
  );
});
