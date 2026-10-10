import assert from "node:assert/strict";
import test from "node:test";
import {
  beginItem,
  closeItem,
  recordPass,
  recordFailure,
  recordDiagnosis,
} from "../frontend-a1-execute.mjs";
import { validateExecutionState } from "../frontend-a1-process.mjs";
import { renderA1Ledger } from "../audit-frontend-a1.mjs";
import { fixture } from "../frontend-a1-test-fixture.mjs";
const challenge = (fn) => async () => {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
};
test(
  "FE-A1.6-W07-AC01 critical: no subset of criteria can manufacture closure",
  challenge((f) => {
    beginItem(f.data, f.item.id);
    assert.throws(
      () =>
        recordPass(
          f.data,
          f.proof("execution", (p) => p.criteria.pop()),
          f.root,
        ),
      /every criterion/,
    );
    assert.throws(() => closeItem(f.data, f.root), /execution and critical/);
  }),
);
test(
  "FE-A1.6-W07-AC02 critical: all but one child still leaves the stage incomplete",
  challenge(async (f) => {
    const children = f.data.work_items.filter(
      (item) => item.milestone === "FE-A1.0",
    );
    children.slice(1).forEach((item) => (item.status = "complete"));
    const report = await renderA1Ledger(f.data);
    assert.match(report, /FE-A1\.0.*5 \/ 6.*in_progress/);
    assert.doesNotMatch(report, /FE-A1\.0.*5 \/ 6.*\| complete/);
  }),
);
test(
  "FE-A1.6-W07-AC03 critical: unchanged acceptance cannot survive a reopened dependency",
  challenge(async (f) => {
    f.data.user_acceptance = { actor: "user", decision: "accepted" };
    f.item.status = "in_progress";
    f.data.active_work = {
      item: f.item.id,
      phase: "execution",
      failed_attempts: 0,
    };
    const { reopenItem } = await import("../frontend-a1-execute.mjs");
    reopenItem(
      f.data,
      f.item.id,
      "Prerequisite evidence changed after inspection; invalidate all dependent completion.",
    );
    assert.equal(f.data.user_acceptance, null);
    assert.equal(f.data.active_work, null);
    validateExecutionState(f.data);
  }),
);
test(
  "FE-A1.6-W07-AC04 critical: cloned execution cannot masquerade as critical review",
  challenge((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    const ref = f.proof(
      "critical",
      (p) =>
        (p.runs[0].argv = [
          "node",
          "--test",
          "--test-reporter=tap",
          "test/execution.test.mjs",
        ]),
    );
    assert.throws(() => recordPass(f.data, ref, f.root), /repeats execution/);
    assert.equal(f.data.active_work.passes.length, 1);
  }),
);
test(
  "FE-A1.6-W07-AC05 critical: a counter reset without broad diagnosis is rejected",
  challenge((f) => {
    beginItem(f.data, f.item.id);
    recordFailure(
      f.data,
      "First failed attempt at the same contract boundary.",
    );
    recordFailure(
      f.data,
      "Second failed attempt at the same contract boundary.",
    );
    assert.throws(
      () => recordPass(f.data, f.proof("execution"), f.root),
      /broad diagnosis/,
    );
    assert.throws(
      () =>
        recordDiagnosis(f.data, {
          changed_remedy: "Reset and try the same remedy again.",
        }),
      /must examine contract/,
    );
  }),
);
