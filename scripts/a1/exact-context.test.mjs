import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
import { runBrowser } from "./run-browser.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.3-W04-AC01 execution: follow-ups bind the prior terminal turn and exact current basis", () => {
  runVitest(
    "@petra/core",
    ["project-copilot-conversation.test.ts"],
    "answers a normal question",
    1,
  );
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "claims a concurrent identity|retains an immutable owner-bound input",
    2,
  );
});
test("FE-A1.3-W04-AC02 execution: definition inquiry Work and retained disclosure expose included and withheld context", () => {
  runVitest(
    "@petra/server",
    ["project-copilot-context.test.ts"],
    "composes exact declared|preserves whole definition",
    2,
  );
  runBrowser(
    "apps/workbench/test/a1-exact-context-browser.mjs",
    "Exact retained input disclosure matched the production context.",
  );
});
test("FE-A1.3-W04-AC03 execution: restricted native bytes and examination records retain their exact admission boundary", () => {
  runVitest(
    "@petra/server",
    ["project-copilot.test.ts"],
    "withholds restricted|admits an examination",
    2,
  );
  runVitest(
    "@petra/server",
    ["project-copilot-context.test.ts"],
    "preserves unavailable inquiry",
    1,
  );
});
