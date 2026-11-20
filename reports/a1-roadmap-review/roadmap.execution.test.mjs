import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  data,
  item,
  root,
  text,
  approvalText,
  approvalHold,
  shellFirst,
  nativeAndCycleContract,
  ownership,
  scopeBinding,
  unchangedProduct,
} from "./helpers.mjs";
import { validateA1Inventory } from "../../scripts/audit-frontend-a1.mjs";
import {
  executionOrder,
  assertExecutionMirrors,
  roadmaps,
} from "../../scripts/frontend-a1-process.mjs";
import {
  assertRoadmapSynchronization,
  beginItem,
} from "../../scripts/frontend-a1-execute.mjs";
import { assertDeliveryWavePrerequisites } from "../../scripts/wave-handoff.mjs";
const operations = JSON.parse(
  text("scripts/ui-operation-inventory.json"),
).operations;

test("Planning execution: preserve all required IDs, operations, requests and flows", () => {
  validateA1Inventory(data, operations, { root });
  assert.equal(data.work_items.length, 90);
  assert.equal(data.operation_coverage.length, 116);
  assert.equal(data.request_coverage.length, 23);
  assert.equal(data.flow_coverage.length, 18);
  assert.equal(
    data.operation_coverage.filter((r) => r.release === "FE-A1").length,
    97,
  );
  assert.equal(
    data.operation_coverage.filter((r) => r.release === "Wave 7").length,
    15,
  );
  assert.equal(
    data.operation_coverage.filter((r) => r.release === "Wave 8").length,
    4,
  );
});
test("Planning execution: no active product work and explicit approval prerequisite", () =>
  approvalHold());
test("Planning execution: each pending construction has ordered steps and two distinct check recipes", () => {
  for (const w of data.work_items.filter((w) => w.status !== "complete")) {
    assert.ok((w.implementation.match(/^\d+\. /gm) || []).length >= 3, w.id);
    const execution = w.implementation
      .split("Execution pass: ")[1]
      ?.split("\n\nCritical pass: ")[0];
    const critical = w.implementation
      .split("Critical pass: ")[1]
      ?.split("\n\nRepair")[0];
    assert.ok(execution?.length > 40 && critical?.length > 40, w.id);
    assert.notEqual(execution, critical, w.id);
    assert.match(critical, /each acceptance criterion/);
  }
});
test("Planning execution: dependency order is acyclic, complete and copilot-first", () => {
  const order = executionOrder(data);
  const seen = new Set();
  for (const w of order) {
    assert.ok(
      w.depends_on.every((id) => seen.has(id)),
      w.id,
    );
    seen.add(w.id);
  }
  assert.equal(seen.size, 90);
  shellFirst();
});
test("Planning execution: generic turn ownership and complete action mediation are separate", () =>
  ownership());
test("Planning execution: three native definitions and complete repeated-cycle dependencies remain mandatory", () =>
  nativeAndCycleContract());
test("Planning execution: all seven diagnoses retain ordered owners", () => {
  for (let i = 1; i <= 7; i++)
    assert.ok(
      data.repair_sequence.some(
        (r) => r.diagnoses.includes(i) && r.work_items.length,
      ),
    );
  assert.deepEqual(
    data.repair_sequence.map((r) => r.order),
    [1, 2, 3, 4, 5, 6],
  );
  assert.match(data.repair_sequence[0].resolution, /explicit user approval/);
});
test("Planning execution: optional late scenarios and excluded native screen-reader evaluation retain their scope", () => {
  assert.equal(data.optional_scenarios.length, 16);
  assert.ok(
    data.optional_scenarios.every(
      (s) => s.required === false && s.phase === "FE-A1.7",
    ),
  );
  assert.match(
    approvalText(),
    /native screen-reader evaluation are not\s+A1 requirements/,
  );
  assert.match(
    approvalText(),
    /Per-function execution and critical evidence remain\s+mandatory/,
  );
});
test("Planning execution: all generated roadmaps and both configured execution copies agree", async () => {
  await assertRoadmapSynchronization(data, root);
  assertExecutionMirrors(root);
  for (const path of roadmaps)
    assert.match(text(path), /A1-APPROVAL-HOLD:START/);
    for (let wave = 3; wave <= 8; wave++)
      assert.match(
        text(`scripts/wave-handoff-wave-${wave}.md`),
        /this packet does not authorize product work/,
      );
  assert.equal(
    readFileSync(
      resolve(root, "../petra-design/reports/FE-A1-ROADMAP-APPROVAL.md"),
      "utf8",
    ),
    approvalText(),
  );
});
test("Planning execution: scope binding identifies the exact proposed contract", () => {
  assert.equal(scopeBinding(), data.roadmap_review.scope_binding);
  assert.ok(approvalText().includes(scopeBinding()));
});
test("Planning execution: existing pure selection gate rejects every product item before approval", () => {
  for (const w of data.work_items.filter((w) => w.milestone !== "FE-A1.0")) {
    const copy = structuredClone(data);
    assert.throws(() => beginItem(copy, w.id), /incomplete prerequisites/);
    assert.equal(copy.active_work, null);
  }
  assert.throws(
    () => beginItem(structuredClone(data), "FE-A1.0-W05"),
    /planned required item/,
  );
});
test("Planning execution: legacy and later-wave mutation gates remain closed", () => {
  for (const wave of ["6", "7", "8"])
    for (const cmd of ["worker", "resume", "extend", "accept"])
      assert.throws(() => assertDeliveryWavePrerequisites(wave, cmd, root));
});
test("Planning execution: interrupted work and old proofs remain historical", () => {
  assert.ok(
    item("FE-A1.3-W03").execution_history.some(
      (h) => h.disposition === "suspended_by_explicit_user_instruction",
    ),
  );
  for (const id of [
    "FE-A1.0-W05",
    "FE-A1.6-W07",
    "FE-A1.3-W01",
    "FE-A1.3-W02",
  ]) {
    assert.ok(item(id).historical_completion_evidence.length);
    assert.equal(item(id).completion_evidence.length, 0);
  }
  assert.equal(data.roadmap_review.prior_verified_items.length, 9);
});
test("Planning execution: no product or controller files changed in either worktree", () => {
  unchangedProduct();
});
