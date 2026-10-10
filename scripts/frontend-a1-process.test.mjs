import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { a1CompletionProblems } from "./audit-frontend-a1.mjs";
import {
  assertExecutionMirrors,
  criterionIds,
  executionOrder,
  validateCompletionPasses,
  validateExecutionState,
} from "./frontend-a1-process.mjs";
import {
  assertRoadmapSynchronization,
  beginItem,
  beginRepair,
  closeItem,
  executeVerification,
  recordDiagnosis,
  recordFailure,
  recordPass,
  synchronizeA1,
} from "./frontend-a1-execute.mjs";
import { fixture, ledger } from "./frontend-a1-test-fixture.mjs";

const withFixture = (fn) => async () => {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
};

test(
  "AC01 execution: roadmap and both execution environments synchronize",
  withFixture(async (f) => {
    await synchronizeA1(f.data, f.root, [f.mirror]);
    await assertRoadmapSynchronization(f.data, f.root);
    assertExecutionMirrors(f.root, [f.mirror]);
    const packet = readFileSync(
      join(f.root, "scripts/frontend-a1-execution.md"),
      "utf8",
    );
    for (const item of f.data.work_items)
      for (const id of criterionIds(item)) assert.ok(packet.includes(id));
  }),
);

test("AC02 execution: one dependency-ready item preserves historical construction", () => {
  const data = ledger();
  data.active_work = null;
  data.work_items.forEach((i) => {
    i.status = "planned";
  });
  const prior = structuredClone(
    data.work_items.find((i) => i.historical_completion_evidence)
      ?.historical_completion_evidence,
  );
  const order = executionOrder(data);
  const seen = new Set();
  for (const item of order) {
    assert.ok(item.depends_on.every((id) => seen.has(id)));
    seen.add(item.id);
  }
  beginItem(data, "FE-A1.0-W06");
  validateExecutionState(data);
  assert.throws(() => beginItem(data, "FE-A1.0-W01"), /active work/);
  assert.deepEqual(
    data.work_items.find((i) => i.historical_completion_evidence)
      ?.historical_completion_evidence,
    prior,
  );
});

test(
  "AC03 execution: real tests are executed and exact candidate sources retained",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    const result = executeVerification(
      f.data,
      {
        work_item: f.item.id,
        pass: "execution",
        argv: [
          "node",
          "--test",
          "--test-reporter=tap",
          "test/execution.test.mjs",
        ],
        sources: [
          "implementation.txt",
          "test/execution.test.mjs",
          "test/critical.test.mjs",
        ],
        criteria: criterionIds(f.item).map((id) => ({
          id,
          result: "passed",
          test: "execution outcome",
          observation:
            "Actual fixture test was executed through the capture runner.",
        })),
        boundary:
          "Runner integration only; synthetic test proves no product behavior.",
      },
      f.root,
    );
    assert.equal(result.failed, false);
    assert.equal(f.data.active_work.phase, "critical");
    const proof = JSON.parse(readFileSync(join(f.root, result.artifact)));
    assert.equal(proof.candidate_commit, f.candidate);
    assert.match(
      readFileSync(join(f.root, proof.runs[0].output), "utf8"),
      /ok 1 - execution outcome/,
    );
  }),
);

test(
  "AC04 execution: distinct critical pass follows execution before closure",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    recordPass(f.data, f.proof("critical"), f.root);
    closeItem(f.data, f.root);
    assert.equal(f.item.status, "complete");
    assert.equal(f.data.active_work, null);
    validateCompletionPasses(f.item, f.root);
  }),
);

test(
  "AC05 execution: repair retains findings and repeated failures require broad diagnosis",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    recordFailure(
      f.data,
      "Critical recovery challenge failed on the retained state.",
    );
    beginRepair(
      f.data,
      "Repair the failed recovery boundary and repeat affected functional checks.",
    );
    assert.equal(f.data.active_work.repairs[0].prior_passes.length, 1);
    assert.equal(f.data.active_work.passes.length, 0);
    recordFailure(
      f.data,
      "The same repair boundary failed for a second attempt.",
    );
    assert.equal(f.data.active_work.phase, "diagnosis_required");
    const diagnosis = Object.fromEntries(
      [
        "contract",
        "architecture",
        "dependencies",
        "environment",
        "verification",
        "changed_remedy",
      ].map((key) => [
        key,
        `Broad examination of ${key} and its effect on the failed boundary.`,
      ]),
    );
    recordDiagnosis(f.data, diagnosis);
    assert.equal(f.data.active_work.phase, "execution");
    assert.equal(f.data.active_work.diagnoses[0].failures.length, 2);
  }),
);

test("AC06 execution: contracted semantics remain required and late scenarios optional", () => {
  const data = ledger();
  assert.equal(data.optional_scenarios.length, 16);
  assert.ok(
    data.optional_scenarios.every((i) => !i.required && i.phase === "FE-A1.7"),
  );
  const requirements = data.work_items
    .flatMap((i) => [i.implementation, ...i.acceptance])
    .join("\n");
  assert.match(
    requirements,
    /native screen-reader evaluation remains excluded/i,
  );
  assert.match(requirements, /browser.*semantics/i);
  assert.equal(data.execution_policy.controlling_decision, "D025");
  assert.equal(data.controlling_decision, "D024");
});

test(
  "AC07 execution: engineering records do not record user acceptance",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    recordPass(f.data, f.proof("critical"), f.root);
    closeItem(f.data, f.root);
    assert.equal(f.data.user_acceptance, null);
    assert.ok(
      a1CompletionProblems(f.data, { root: f.root }).includes(
        "explicit user acceptance is missing",
      ),
    );
  }),
);
