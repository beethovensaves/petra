import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  readA1,
  assertRoadmapSynchronization,
} from "../frontend-a1-execute.mjs";
import {
  executionOrder,
  assertExecutionMirrors,
  roadmaps,
} from "../frontend-a1-process.mjs";
import { repositoryRoot, validateA1Inventory } from "../audit-frontend-a1.mjs";
import { assertDeliveryWavePrerequisites } from "../wave-handoff.mjs";
const data = readA1();
const operations = JSON.parse(
  readFileSync(join(repositoryRoot, "scripts/ui-operation-inventory.json")),
).operations;
const text = (path) => readFileSync(join(repositoryRoot, path), "utf8");

test("FE-A1.0-W01-AC01 execution: inspection rejection remains explicit", () => {
  assert.equal(
    data.feedback_history.find((entry) => entry.date === "2026-10-07").decision,
    "changes_requested",
  );
  assert.match(
    text("reports/FRONTEND-ADAPTATION-MILESTONE.md"),
    /frontend was rejected on 2026-10-07/,
  );
  for (const decision of [
    "D024-agentic-split-workspace",
    "D013-ag-ui-interaction-protocol",
    "D018-project-definition-and-checkpoint-boundary",
    "D025-contract-ledger-and-two-pass-delivery",
  ]) {
    // Decision lookup follows its stable ID; filenames are not semantic IDs.
    const id = decision.slice(0, 4);
    assert.ok(
      text("ROADMAP.md").includes(id) ||
        text("scripts/frontend-a1-execution.md").includes(id),
    );
  }
});
test("FE-A1.0-W01-AC02 execution: historical mechanics retain their original limits", () => {
  const old = JSON.parse(text("reports/FE-A1-CONSTRUCTION-CHECKS.json"));
  assert.equal(old.verified_at, "2026-10-07T20:32:38.890215Z");
  assert.equal(old.candidate.commit, null);
  assert.match(old.scope, /partial A1 construction/);
  assert.ok(old.remaining_boundaries.length >= 8);
  assert.ok(
    data.work_items.some((item) => item.historical_completion_evidence?.length),
  );
  const index = JSON.parse(text("reports/FE-A1-EVIDENCE-INDEX.json"));
  assert.match(
    index.historical_construction.boundary,
    /not the current candidate/,
  );
});
test("FE-A1.0-W02-AC01 execution: all eight stages retain granular criteria and owners", () => {
  validateA1Inventory(data, operations);
  assert.equal(data.milestones.length, 8);
  for (const milestone of data.milestones)
    assert.ok(data.work_items.some((item) => item.milestone === milestone.id));
  const ordered = executionOrder(data),
    seen = new Set();
  for (const item of ordered) {
    assert.ok(item.depends_on.every((id) => seen.has(id)));
    assert.ok(item.acceptance.length >= 2);
    seen.add(item.id);
  }
});
test("FE-A1.0-W02-AC02 execution: completion requires criterion evidence and prerequisites", () => {
  assert.match(
    text("scripts/frontend-a1-execution.md"),
    /Close the item only with both passing records/,
  );
  assert.match(
    text("scripts/frontend-a1-process.mjs"),
    /requires execution and critical completion evidence/,
  );
  assert.equal(data.execution_policy.maximum_active_items, 1);
});
test("FE-A1.0-W03-AC01 execution: all 97 adapted operations have exact A1 owners", () => {
  const rows = data.operation_coverage.filter((row) => row.release === "FE-A1");
  assert.equal(rows.length, 97);
  assert.ok(
    rows.every((row) =>
      data.work_items.some((item) => item.id === row.work_item),
    ),
  );
});
test("FE-A1.0-W03-AC02 execution: later-wave operations keep explicit boundaries", () => {
  assert.equal(
    data.operation_coverage.filter((row) => row.release === "Wave 7").length,
    15,
  );
  assert.equal(
    data.operation_coverage.filter((row) => row.release === "Wave 8").length,
    4,
  );
  assert.equal(data.operation_coverage.length, 116);
  assert.equal(data.request_coverage.length, 23);
  assert.equal(data.flow_coverage.length, 18);
});
test("FE-A1.0-W03-AC03 execution: connected cycles remain independent required construction", () => {
  for (const id of [
    "FE-A1.3-W07",
    "FE-A1.3-W03",
    "FE-A1.4-W06",
    "FE-A1.4-W10",
    "FE-A1.4-W13",
    "FE-A1.4-W14",
    "FE-A1.4-W15",
  ])
    assert.ok(data.repair_sequence.some((row) => row.work_items.includes(id)));
  assert.ok(
    data.repair_sequence.every((row) =>
      row.work_items.every((id) =>
        data.work_items.some((item) => item.id === id),
      ),
    ),
  );
});
test("FE-A1.0-W04-AC01 execution: incomplete A1 blocks all mutating delivery entries", () => {
  for (const wave of ["6", "7", "8"])
    for (const command of ["worker", "resume", "extend", "accept"])
      assert.throws(() =>
        assertDeliveryWavePrerequisites(wave, command, repositoryRoot),
      );
});
test("FE-A1.0-W04-AC02 execution: status and stop remain available", () => {
  for (const wave of ["6", "7", "8"])
    for (const command of ["status", "stop"])
      assert.doesNotThrow(() =>
        assertDeliveryWavePrerequisites(wave, command, repositoryRoot),
      );
});
test("FE-A1.0-W04-AC03 execution: controller preserves actual user acceptance authority", () => {
  assert.match(
    text("scripts/audit-frontend-a1.mjs"),
    /explicit user acceptance is missing/,
  );
  assert.match(
    text("scripts/frontend-a1-execution.md"),
    /Never self-record acceptance/,
  );
});
test("FE-A1.0-W05-AC01 execution: every current roadmap agrees with the canonical queue", async () => {
  await assertRoadmapSynchronization(data, repositoryRoot);
  assertExecutionMirrors(repositoryRoot);
  for (const path of roadmaps)
    assert.doesNotMatch(
      text(path),
      /Eight documentation\/creation items are complete and 81 remain open|FE-A1\.0 is complete; all product/,
    );
});
test("FE-A1.0-W05-AC02 execution: the immediate sequence ends at explicit acceptance", () => {
  const packet = text("scripts/frontend-a1-execution.md");
  assert.match(packet, /Wave 7\/8|Legacy|Historical frozen Wave 6/);
  assert.match(packet, /explicit user acceptance/);
  assert.deepEqual(data.repair_sequence[0].diagnoses, [5, 6, 7]);
  assert.ok(data.repair_sequence.at(-1).work_items.includes("FE-A1.7-W13"));
});
