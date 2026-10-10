import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.3-W03-AC01 critical: retry mutation and uncertain delivery cannot replace history or launch a second effect", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "rejects conflicting retries|prevents updates",
    2,
  );
});
test("FE-A1.3-W03-AC02 critical: a metadata store cannot masquerade as canonical conversation authority", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "requires canonical ownership|denies a copied material",
    2,
  );
});
test("FE-A1.3-W03-AC03 critical: malformed foreign history cursors and validly rehashed foreign owners release no content", () => {
  runVitest(
    "@petra/server",
    ["project-copilot.test.ts"],
    "denies unavailable owner permission",
    1,
  );
  runVitest(
    "@petra/adapters",
    ["copilot-permission-client.test.ts"],
    "denies rehashed receipt",
    1,
  );

  runVitest(
    "@petra/postgres",
    ["copilot-permission-authority.test.ts"],
    "denies widened|denies another actor",
    2,
  );

  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "denies malformed foreign|rejects validly rehashed",
    2,
  );
});
test("FE-A1.3-W03-AC04 critical: unknown measurements cannot satisfy limits and actual timeout failures cannot invent output", () => {
  runVitest(
    "@petra/core",
    ["conversation-resource-controls.test.ts"],
    "unknown|retains an actual|preserves provider usage",
    9,
  );
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "rolls back terminal content",
    1,
  );
});
test("FE-A1.3-W03-AC05 critical: substituted controls false imports missing material and changed retry content are denied", () => {
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "denies substituted authority|rejects validly rehashed",
    2,
  );
});
