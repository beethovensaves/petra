import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  a1CompletionProblems,
  candidateFingerprint,
  renderA1Ledger,
  repositoryRoot,
  validateA1Inventory,
} from "./audit-frontend-a1.mjs";
import { assertDeliveryWavePrerequisites } from "./wave-handoff.mjs";

const readJson = (path) =>
  JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
const ledger = readJson("scripts/frontend-a1-work-inventory.json");
const operations = readJson("scripts/ui-operation-inventory.json").operations;
const copy = () => structuredClone(ledger);

test("the actual functional ledger covers the retained inventory and matches its report", async () => {
  validateA1Inventory(ledger, operations);
  assert.equal(
    await renderA1Ledger(ledger),
    readFileSync(
      resolve(
        repositoryRoot,
        "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md",
      ),
      "utf8",
    ),
  );
});

test("required work cannot be deleted or deferred to release A1", () => {
  const missing = copy();
  missing.work_items = missing.work_items.filter(
    (item) => item.id !== "FE-A1.4-W13",
  );
  assert.throws(
    () => validateA1Inventory(missing, operations),
    /Required A1 work removed/,
  );
  const deferred = copy();
  deferred.work_items.find((item) => item.id === "FE-A1.4-W13").status =
    "deferred";
  assert.throws(
    () => validateA1Inventory(deferred, operations),
    /cannot be skipped/,
  );
});

test("completed work requires completed prerequisites and retained evidence", () => {
  const unfinished = copy();
  unfinished.work_items.find((item) => item.id === "FE-A1.0-W01").status =
    "complete";
  assert.throws(
    () => validateA1Inventory(unfinished, operations),
    /completed before/,
  );
  const unsupported = copy();
  unsupported.work_items.find((item) => item.id === "FE-A1.3-W01").status =
    "complete";
  assert.throws(
    () => validateA1Inventory(unsupported, operations),
    /completed before|execution and critical completion evidence/,
  );
});

test("dependency cycles cannot produce an executable work sequence", () => {
  const cyclic = copy();
  cyclic.work_items
    .find((item) => item.id === "FE-A1.3-W01")
    .depends_on.push("FE-A1.3-W06");
  assert.throws(
    () => validateA1Inventory(cyclic, operations),
    /dependency cycle/,
  );
});

test("operations cannot be omitted, duplicated or moved out of A1", () => {
  const missing = copy();
  missing.operation_coverage.pop();
  assert.throws(
    () => validateA1Inventory(missing, operations),
    /exactly match/,
  );
  const duplicate = copy();
  duplicate.operation_coverage.push(duplicate.operation_coverage[0]);
  assert.throws(
    () => validateA1Inventory(duplicate, operations),
    /Duplicate operation/,
  );
  const moved = copy();
  moved.operation_coverage[0].release = "Wave 7";
  assert.throws(
    () => validateA1Inventory(moved, operations),
    /cannot leave A1/,
  );
});

test("accepted requirement and flow dispositions cannot become orphans", () => {
  const missing = copy();
  missing.request_coverage.pop();
  assert.throws(() => validateA1Inventory(missing, operations), /All 23/);
  const orphan = copy();
  orphan.flow_coverage[0].milestones = ["FE-A1.99"];
  assert.throws(
    () => validateA1Inventory(orphan, operations),
    /orphan disposition/,
  );
});

test("optional scenarios remain late checks and cannot be promoted to requirements", () => {
  const changed = copy();
  changed.optional_scenarios[0].required = true;
  assert.throws(
    () => validateA1Inventory(changed, operations),
    /must remain optional/,
  );
  const early = copy();
  early.optional_scenarios[0].phase = "FE-A1.1";
  assert.throws(() => validateA1Inventory(early, operations), /near the end/);
});

// These are synthetic gate fixtures, never written into the product ledger or
// used as implementation evidence or a real user acceptance record.
function engineeringCompleteFixture() {
  const data = copy();
  data.status = "complete";
  data.active_work = null;
  data.work_items.forEach((item) => {
    item.status = "complete";
  });
  data.optional_scenarios.forEach((item) => {
    item.status = "not_run";
  });
  data.user_acceptance = {
    actor: "user",
    decision: "accepted",
    candidate_commit: "a".repeat(40),
    candidate_fingerprint: "b".repeat(64),
    accepted_at: "2026-10-07",
    user_statement: "Synthetic acceptance for gate testing only.",
    artifact: "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md",
  };
  return data;
}

test("optional checks that were not run or selected do not block completed functions", () => {
  const data = engineeringCompleteFixture();
  assert.ok(data.optional_scenarios.every((item) => item.status === "not_run"));
  assert.ok(
    a1CompletionProblems(data, { fingerprint: () => "b".repeat(64) }).every(
      (problem) =>
        !/optional|scenario|mandatory work items incomplete/.test(problem),
    ),
  );
  data.optional_scenarios.forEach((item) => {
    item.status = "not_selected";
  });
  assert.ok(
    a1CompletionProblems(data, { fingerprint: () => "b".repeat(64) }).every(
      (problem) =>
        !/optional|scenario|mandatory work items incomplete/.test(problem),
    ),
  );
});

test("optional scenario content is excluded from the functional acceptance fingerprint", () => {
  const data = copy();
  const original = candidateFingerprint(data);
  data.optional_scenarios[0].task = "A different optional grouping.";
  data.work_items[0].optional_scenarios = [];
  assert.equal(candidateFingerprint(data), original);
  data.work_items[0].acceptance.push("A different required criterion.");
  assert.notEqual(candidateFingerprint(data), original);
});

test("engineering completion cannot substitute for user acceptance or accept changed code", () => {
  const data = engineeringCompleteFixture();
  data.user_acceptance.actor = "backend";
  assert.ok(
    a1CompletionProblems(data).includes("explicit user acceptance is missing"),
  );
  data.user_acceptance.actor = "user";
  assert.ok(
    a1CompletionProblems(data, { fingerprint: () => "c".repeat(64) }).some(
      (message) => message.includes("different implementation"),
    ),
  );
});

test("the read-only CLI reports functional completion without requiring optional checks", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/audit-frontend-a1.mjs", "--require-complete"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const problems = a1CompletionProblems(ledger);
  assert.equal(result.status, problems.length ? 1 : 0);
  if (ledger.work_items.some((item) => item.status !== "complete"))
    assert.match(result.stderr, /mandatory work items incomplete/);
  if (!ledger.user_acceptance)
    assert.match(result.stderr, /explicit user acceptance is missing/);
  assert.doesNotMatch(result.stderr, /scenarios lack/);
});

test("later-wave execution paths are blocked before workers or state mutation", () => {
  const root = mkdtempSync(join(tmpdir(), "petra-a1-gate-test-"));
  try {
    const data = copy();
    data.status = "in_progress";
    data.user_acceptance = null;
    data.active_work = null;
    data.work_items.forEach((item) => {
      item.status = "planned";
      item.retained_evidence = [];
    });
    data.optional_scenarios.forEach((item) => {
      item.status = "not_run";
    });
    mkdirSync(join(root, "scripts"));
    writeFileSync(
      join(root, "scripts/frontend-a1-work-inventory.json"),
      JSON.stringify(data),
    );
    writeFileSync(
      join(root, "scripts/ui-operation-inventory.json"),
      JSON.stringify({ operations }),
    );
    for (const wave of ["6", "7", "8"]) {
      for (const command of ["worker", "resume", "extend", "accept"]) {
        assert.throws(
          () => assertDeliveryWavePrerequisites(wave, command, root),
          /FE-A1 blocks later waves/,
          `${command} Wave ${wave}`,
        );
      }
    }
    assert.doesNotThrow(() =>
      assertDeliveryWavePrerequisites("7", "status", root),
    );
    assert.doesNotThrow(() =>
      assertDeliveryWavePrerequisites("7", "stop", root),
    );
    assert.throws(
      () => assertDeliveryWavePrerequisites("6", "worker", root),
      /FE-A1 blocks later waves/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const status = spawnSync(
    process.execPath,
    ["scripts/wave-handoff.mjs", "status", "--wave", "7"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(status.status, 0, "Read-only status stays available.");
});
