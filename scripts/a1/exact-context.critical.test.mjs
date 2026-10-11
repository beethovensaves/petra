import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.3-W04-AC01 critical: stale parents and changed rights cannot borrow prior private history or replace original inputs", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "rejects conflicting retries|restores the original graph presentation",
    2,
  );
  runVitest(
    "@petra/core",
    ["project-copilot.test.ts"],
    "withholds old questions|persists the exact disclosed history",
    2,
  );
});
test("FE-A1.3-W04-AC02 critical: unavailable coverage and omitted metadata cannot masquerade as complete evidence", () => {
  runVitest(
    "@petra/server",
    ["project-copilot-context.test.ts"],
    "preserves unavailable inquiry|enforces the total context budget",
    2,
  );
  runVitest(
    "@petra/core",
    ["project-copilot.test.ts"],
    "retains failure and never invokes",
    1,
  );
});
test("FE-A1.3-W04-AC03 critical: equal-content changed identities mixed snapshots and revoked access stop before invocation", () => {
  runVitest(
    "@petra/server",
    ["project-copilot-context.test.ts"],
    "rejects missing corrupted|rejects validly rehashed|rechecks the final|rejects an equal-content|withholds stale native|denies a revoked",
    6,
  );
});
