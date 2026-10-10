import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
import { runBrowser } from "./run-browser.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.3-W03-AC01 execution: retained questions answers citations and outcomes restore in a new document", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "claims a concurrent identity|restores the original graph presentation|pages exact retained",
    3,
  );
  runBrowser(
    "apps/workbench/test/a1-owned-conversation-browser.mjs",
    "Actual canonical conversation and fresh-browser restoration passed.",
  );
});
test("FE-A1.3-W03-AC02 execution: actual readable content is backed by retained Artifacts rather than a metadata view", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "binds readable native question",
    1,
  );
});
test("FE-A1.3-W03-AC03 execution: exact actor Project and immutable model input scope survives restart", () => {
  runVitest(
    "@petra/adapters",
    ["copilot-permission-client.test.ts"],
    "submits only the exact explicit",
    1,
  );

  runVitest(
    "@petra/postgres",
    ["copilot-permission-authority.test.ts"],
    "requires explicit reviewed|converges concurrent",
    2,
  );

  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "isolates reads|retains an immutable owner-bound input",
    2,
  );
});
test("FE-A1.3-W03-AC04 execution: completed failed cancelled and imported content resolves to existing native owners", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "retains failed and cancelled|adopts immutable historical|preserves a controlled-writing",
    3,
  );
});
test("FE-A1.3-W03-AC05 execution: actual inquiry Work Review and cycle lineage remains exact on replay", () => {
  runVitest(
    "@petra/postgres",
    ["working-state-authority-repository.test.ts"],
    "retains canonical conversation lineage",
    1,
  );
});
