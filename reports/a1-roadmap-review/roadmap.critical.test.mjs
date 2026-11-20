import assert from "node:assert/strict";
import test from "node:test";
import {
  data,
  item,
  root,
  text,
  approvalHold,
  shellFirst,
  nativeAndCycleContract,
  ownership,
} from "./helpers.mjs";
import {
  validateA1Inventory,
  a1CompletionProblems,
} from "../../scripts/audit-frontend-a1.mjs";
import {
  assertRoadmapSynchronization,
  beginItem,
} from "../../scripts/frontend-a1-execute.mjs";
const operations = JSON.parse(
  text("scripts/ui-operation-inventory.json"),
).operations;
const copy = () => structuredClone(data);

test("Planning critical: native examiners cannot close before exact Source reading", () => {
  const d = copy();
  item("FE-A1.4-W06", d).depends_on = item("FE-A1.4-W06", d).depends_on.filter(
    (id) => id !== "FE-A1.4-W04",
  );
  assert.throws(() => nativeAndCycleContract(d), /native examination precedes/);
});
test("Planning critical: stale/restricted graph fencing is mandatory before agent guidance", () => {
  const d = copy();
  item("FE-A1.4-W19", d).depends_on = item("FE-A1.4-W19", d).depends_on.filter(
    (id) => id !== "FE-A1.4-W21",
  );
  assert.throws(() => nativeAndCycleContract(d), /graph-guided work precedes/);
});

test("Planning critical: a missing required function cannot be hidden by matching documents", () => {
  const d = copy();
  d.work_items = d.work_items.filter((w) => w.id !== "FE-A1.4-W13");
  assert.throws(
    () => validateA1Inventory(d, operations, { root, checkArtifacts: false }),
    /Required A1 work removed/,
  );
});
test("Planning critical: operation transfer to a later wave is rejected", () => {
  const d = copy();
  d.operation_coverage.find((r) => r.release === "FE-A1").release = "Wave 7";
  assert.throws(
    () => validateA1Inventory(d, operations, { root, checkArtifacts: false }),
    /cannot leave A1/,
  );
});
test("Planning critical: successful tests or an agent assertion cannot release roadmap approval", () => {
  const d = copy();
  d.roadmap_review.user_approval = {
    actor: "assistant",
    decision: "accepted",
    reason: "Planning tests passed",
  };
  assert.throws(() => approvalHold(d));
  item("FE-A1.0-W05", d).status = "complete";
  item("FE-A1.0-W05", d).completion_evidence = [];
  assert.throws(
    () => validateA1Inventory(d, operations, { root }),
    /execution and critical completion evidence/,
  );
});
test("Planning critical: model or backend readiness cannot bypass the user approval prerequisite", () => {
  const d = copy();
  for (const w of d.work_items)
    if (w.id !== "FE-A1.0-W05") w.status = "complete";
  assert.throws(() => beginItem(d, "FE-A1.0-W05"), /planned required item/);
  item("FE-A1.3-W07", d).status = "planned";
  assert.throws(() => beginItem(d, "FE-A1.3-W07"), /incomplete prerequisites/);
});
test("Planning critical: reintroducing backend-first construction is detected", () => {
  const d = copy();
  item("FE-A1.3-W01", d).depends_on = item("FE-A1.3-W01", d).depends_on.filter(
    (id) => !id.startsWith("FE-A1.1"),
  );
  assert.throws(() => shellFirst(d), /runtime starts before/);
});
test("Planning critical: action mediation without native Review or Workspace outcomes is incomplete", () => {
  for (const dep of ["FE-A1.4-W07", "FE-A1.4-W09"]) {
    const d = copy();
    item("FE-A1.3-W07", d).depends_on = item(
      "FE-A1.3-W07",
      d,
    ).depends_on.filter((id) => id !== dep);
    assert.throws(() => shellFirst(d), /action mediation omits/);
  }
});
test("Planning critical: command execution added to generic turn retention breaks ownership", () => {
  const d = copy();
  item("FE-A1.3-W03", d).implementation += " Serialize the execution claim.";
  assert.throws(() => ownership(d));
});
test("Planning critical: a Q&A-only writing or unrelated example cannot replace native examination", () => {
  const d = copy();
  item("FE-A1.4-W06", d).acceptance = [
    "Three Q&A examples use the same shell.",
  ];
  assert.throws(() => nativeAndCycleContract(d), /native contract omitted/);
});
test("Planning critical: writing Requirement alone cannot close Interpretation", () => {
  const d = copy();
  item("FE-A1.4-W06", d).acceptance = item("FE-A1.4-W06", d).acceptance.map(
    (s) => s.replaceAll("Interpretation", "other content"),
  );
  assert.throws(() => nativeAndCycleContract(d), /Interpretation/);
});
test("Planning critical: repeated-cycle completion without disposition or invalidation is rejected", () => {
  for (const dep of ["FE-A1.4-W14", "FE-A1.4-W15"]) {
    const d = copy();
    item("FE-A1.4-W13", d).depends_on = item(
      "FE-A1.4-W13",
      d,
    ).depends_on.filter((id) => id !== dep);
    assert.throws(() => nativeAndCycleContract(d), /cycle closure lacks/);
  }
});
test("Planning critical: a contracted function cannot become deferred or an optional scenario gate", () => {
  const d = copy();
  item("FE-A1.4-W19", d).status = "deferred";
  assert.throws(
    () => validateA1Inventory(d, operations, { root, checkArtifacts: false }),
    /cannot be skipped/,
  );
  const scenario = copy();
  scenario.optional_scenarios[0].required = true;
  assert.throws(
    () =>
      validateA1Inventory(scenario, operations, {
        root,
        checkArtifacts: false,
      }),
    /optional and near the end/,
  );
});
test("Planning critical: changing scope without regenerated instructions fails the real synchronization check", async () => {
  const d = copy();
  item("FE-A1.4-W19", d).implementation += " A changed roadmap scope.";
  await assert.rejects(() => assertRoadmapSynchronization(d, root), /stale/);
});
test("Planning critical: historical reports and purported final acceptance cannot close incomplete product work", () => {
  const d = copy();
  d.user_acceptance = { actor: "assistant", decision: "accepted" };
  const problems = a1CompletionProblems(d, { root });
  assert.ok(
    problems.some((p) => p.includes("mandatory work items incomplete")),
  );
  assert.ok(problems.includes("explicit user acceptance is missing"));
});
test("Planning critical: removing a recorded diagnosis owner cannot produce a complete repair sequence", () => {
  const d = copy();
  d.repair_sequence = d.repair_sequence.filter((r) => !r.diagnoses.includes(4));
  assert.throws(
    () => validateA1Inventory(d, operations, { root, checkArtifacts: false }),
    /seven diagnoses/,
  );
});
