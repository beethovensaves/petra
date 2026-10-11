import test, { before, after } from "node:test";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
test("FE-A1.2-W07-AC01 critical: foreign stale and forged definition reads cannot select another component or template", () => {
  runVitest(
    "@petra/server",
    ["project-definition-routes.test.ts"],
    "rejects identity|denies valid records",
    2,
  );
  runVitest(
    "@petra/adapters",
    ["project-definition-client.test.ts"],
    "rejects foreign identity",
    1,
  );
});
test("FE-A1.2-W07-AC02 critical: ambiguous installations malformed native material and schema hashes cannot imply execution", () => {
  runVitest(
    "@petra/core",
    ["project-definition-components.test.ts"],
    "rejects crossed",
    1,
  );
  runVitest(
    "@petra/workbench",
    ["project-definition-components.test.tsx"],
    "does not give stale",
    1,
  );
});
test("FE-A1.2-W07-AC03 critical: identical content in a newer definition cannot reinterpret retained candidates or original conversation inputs", () => {
  runVitest(
    "@petra/core",
    ["project-definition-components.test.ts"],
    "does not reinterpret retained",
    1,
  );
  runVitest(
    "@petra/postgres",
    ["working-state-authority-repository.test.ts"],
    "marks equal-content later",
    1,
  );
  runVitest(
    "@petra/postgres",
    ["project-copilot-repository.test.ts"],
    "retains an immutable owner-bound input",
    1,
  );
});
