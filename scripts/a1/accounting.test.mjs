import assert from "node:assert/strict";
import test from "node:test";
import {
  beginItem,
  closeItem,
  recordPass,
  recordFailure,
  reopenItem,
} from "../frontend-a1-execute.mjs";
import { validateExecutionState } from "../frontend-a1-process.mjs";
import { renderA1Ledger } from "../audit-frontend-a1.mjs";
import { fixture } from "../frontend-a1-test-fixture.mjs";
const exercise = (fn) => async () => {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
};
test(
  "FE-A1.6-W07-AC01 execution: closure requires both criterion passes and prerequisites",
  exercise((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    assert.throws(() => closeItem(f.data, f.root), /execution and critical/);
    recordPass(f.data, f.proof("critical"), f.root);
    closeItem(f.data, f.root);
    validateExecutionState(f.data);
    assert.equal(f.item.completion_evidence.length, 2);
  }),
);
test(
  "FE-A1.6-W07-AC02 execution: stage completion derives from every mandatory child",
  exercise(async (f) => {
    const report = await renderA1Ledger(f.data);
    assert.match(report, /FE-A1\.0.*0 \/ 6.*in_progress/);
    f.data.work_items
      .filter((item) => item.milestone === "FE-A1.0")
      .forEach((item) => (item.status = "complete"));
    const complete = await renderA1Ledger(f.data);
    assert.match(complete, /FE-A1\.0.*6 \/ 6.*complete/);
  }),
);
test(
  "FE-A1.6-W07-AC03 execution: rejection preserves evidence and revokes acceptance",
  exercise((f) => {
    f.item.status = "complete";
    f.item.completion_evidence = [f.proof("execution"), f.proof("critical")];
    f.data.user_acceptance = { actor: "user", decision: "accepted" };
    reopenItem(
      f.data,
      f.item.id,
      "The user rejected this criterion; affected functions must reopen with history intact.",
    );
    assert.equal(f.data.user_acceptance, null);
    assert.equal(f.item.historical_completion_evidence.length, 2);
  }),
);
test(
  "FE-A1.6-W07-AC04 execution: two distinct suites bind one exact candidate",
  exercise((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    recordPass(f.data, f.proof("critical"), f.root);
    closeItem(f.data, f.root);
    assert.equal(f.item.status, "complete");
  }),
);
test(
  "FE-A1.6-W07-AC05 execution: two failures stop work before advancing another item",
  exercise((f) => {
    beginItem(f.data, f.item.id);
    recordFailure(
      f.data,
      "Execution failed on the selected contract boundary.",
    );
    recordFailure(
      f.data,
      "Repair failed on the same selected contract boundary.",
    );
    assert.equal(f.data.active_work.phase, "diagnosis_required");
    assert.throws(() => beginItem(f.data, "FE-A1.0-W01"), /active work/);
  }),
);
