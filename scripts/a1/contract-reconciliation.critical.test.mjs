import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  a1CompletionProblems,
  validateA1Inventory,
} from "../audit-frontend-a1.mjs";
import {
  assertRoadmapSynchronization,
  beginItem,
  reopenItem,
  synchronizeA1,
} from "../frontend-a1-execute.mjs";
import { validateExecutionState } from "../frontend-a1-process.mjs";
import { fixture, ledger } from "../frontend-a1-test-fixture.mjs";
const operations = JSON.parse(
  readFileSync(new URL("../ui-operation-inventory.json", import.meta.url)),
).operations;
const challenge = (fn) => async () => {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
};

test("FE-A1.0-W01-AC01 critical: an agent cannot reinterpret rejection as acceptance", () => {
  const data = ledger();
  data.user_acceptance = { actor: "integration", decision: "accepted" };
  assert.ok(
    a1CompletionProblems(data).includes("explicit user acceptance is missing"),
  );
});
test("FE-A1.0-W01-AC02 critical: retained test reports cannot close integrated product work", () => {
  const data = ledger();
  data.work_items.forEach((item) => {
    item.status = "complete";
    item.completion_evidence = [
      {
        artifact: "reports/FE-A1-CONSTRUCTION-CHECKS.json",
        command: "true",
        boundary: "Reuse historical report as current completion.",
      },
    ];
  });
  data.active_work = null;
  assert.throws(
    () => validateA1Inventory(data, operations),
    /execution and critical completion evidence/,
  );
});
test("FE-A1.0-W02-AC01 critical: a missing required stage cannot become an executable plan", () => {
  const data = ledger();
  data.milestones.pop();
  assert.throws(() => validateA1Inventory(data, operations), /All eight/);
});
test(
  "FE-A1.0-W02-AC02 critical: required work cannot be deleted deferred or begun early",
  challenge((f) => {
    const removed = structuredClone(f.data);
    removed.work_items = removed.work_items.filter(
      (item) => item.id !== "FE-A1.4-W13",
    );
    assert.throws(
      () => validateA1Inventory(removed, operations, { checkArtifacts: false }),
      /Required A1 work removed/,
    );
    const deferred = structuredClone(f.data);
    deferred.work_items[0].status = "deferred";
    assert.throws(
      () =>
        validateA1Inventory(deferred, operations, { checkArtifacts: false }),
      /cannot be skipped/,
    );
    assert.throws(
      () => beginItem(f.data, "FE-A1.3-W03"),
      /incomplete prerequisites/,
    );
  }),
);
test("FE-A1.0-W03-AC01 critical: operation omission and duplication are rejected", () => {
  for (const mutation of [
    (data) => data.operation_coverage.pop(),
    (data) => data.operation_coverage.push(data.operation_coverage[0]),
  ]) {
    const data = ledger();
    mutation(data);
    assert.throws(
      () => validateA1Inventory(data, operations),
      /exactly match|Duplicate operation/,
    );
  }
});
test("FE-A1.0-W03-AC02 critical: later-wave boundaries cannot absorb required A1 functions", () => {
  const data = ledger();
  data.operation_coverage.find((row) => row.release === "FE-A1").release =
    "Wave 7";
  assert.throws(() => validateA1Inventory(data, operations), /cannot leave A1/);
});
test("FE-A1.0-W03-AC03 critical: a diagnosed product gap cannot lose its required owner", () => {
  const data = ledger();
  data.repair_sequence[3].work_items = ["REMOVED"];
  assert.throws(() => validateA1Inventory(data, operations), /seven diagnoses/);
  data.repair_sequence = data.repair_sequence.filter(
    (row) => !row.diagnoses.includes(4),
  );
  assert.throws(() => validateA1Inventory(data, operations), /seven diagnoses/);
});
test("FE-A1.0-W04-AC01 critical: missing or malformed ledgers fail before delivery mutation", () => {
  const data = ledger();
  data.schema_version = "unknown";
  assert.throws(
    () => validateA1Inventory(data, operations),
    /Unknown A1 ledger schema/,
  );
});
test(
  "FE-A1.0-W04-AC02 critical: safe observation needs no writable acceptance state",
  challenge(async (f) => {
    const { assertDeliveryWavePrerequisites } =
      await import("../wave-handoff.mjs");
    for (const command of ["status", "stop"])
      assert.doesNotThrow(() =>
        assertDeliveryWavePrerequisites("7", command, f.root),
      );
  }),
);
test("FE-A1.0-W04-AC03 critical: a changed candidate and forged actor do not release A1", () => {
  const data = ledger();
  data.user_acceptance = {
    actor: "user",
    decision: "accepted",
    candidate_commit: "a".repeat(40),
    candidate_fingerprint: "b".repeat(64),
    accepted_at: "2026-10-10",
    user_statement: "Synthetic assertion for gate challenge.",
    artifact: "README.md",
  };
  assert.ok(
    a1CompletionProblems(data, { fingerprint: () => "c".repeat(64) }).some(
      (problem) => problem.includes("different implementation"),
    ),
  );
});
test(
  "FE-A1.0-W05-AC01 critical: a matching marker cannot excuse contradictory roadmap text",
  challenge(async (f) => {
    await synchronizeA1(f.data, f.root, [f.mirror]);
    const file = new URL(`file://${f.root}/ROADMAP.md`);
    f.put(
      "ROADMAP.md",
      readFileSync(file, "utf8").replace(
        "Wave 7/8 stay blocked",
        "Wave 7/8 may proceed",
      ),
    );
    await assert.rejects(
      () => assertRoadmapSynchronization(f.data, f.root),
      /stale/,
    );
  }),
);
test(
  "FE-A1.0-W05-AC02 critical: rejection reopens dependencies and revokes release",
  challenge((f) => {
    f.item.status = "complete";
    f.item.completion_evidence = [f.proof("execution"), f.proof("critical")];
    f.data.user_acceptance = { actor: "user", decision: "accepted" };
    reopenItem(
      f.data,
      f.item.id,
      "A review rejected the integrated behavior; preserve history and reopen affected required work.",
    );
    validateExecutionState(f.data);
    assert.equal(f.data.user_acceptance, null);
    assert.equal(f.item.status, "planned");
    assert.ok(f.item.historical_completion_evidence.length === 2);
  }),
);
