import assert from "node:assert/strict";
import { readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  a1CompletionProblems,
  candidateFingerprint,
  validateA1Inventory,
} from "./audit-frontend-a1.mjs";
import { assertDeliveryWavePrerequisites } from "./wave-handoff.mjs";
import {
  assertExecutionMirrors,
  validateCompletionPasses,
  validatePass,
  validateExecutionState,
} from "./frontend-a1-process.mjs";
import {
  assertRoadmapSynchronization,
  beginItem,
  beginRepair,
  recordDiagnosis,
  recordFailure,
  recordPass,
  reopenItem,
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
  "AC01 critical: narrative drift fails even with an unchanged binding marker",
  withFixture(async (f) => {
    await synchronizeA1(f.data, f.root, [f.mirror]);
    f.put(
      "ROADMAP.md",
      readFileSync(join(f.root, "ROADMAP.md"), "utf8").replace(
        "The sixteen late scenarios are optional",
        "The sixteen late scenarios are mandatory",
      ),
    );
    await assert.rejects(
      () => assertRoadmapSynchronization(f.data, f.root),
      /synchronization is stale/,
    );
    assert.throws(() => assertExecutionMirrors(f.root, [f.mirror]), /drift/);
  }),
);

test("AC02 critical: concurrent work and unmet dependencies cannot hide as progress", () => {
  const data = ledger();
  data.active_work = null;
  data.work_items.forEach((item) => {
    item.status = "planned";
  });
  beginItem(data, "FE-A1.0-W06");
  data.work_items.find((i) => i.id === "FE-A1.0-W01").status = "in_progress";
  assert.throws(() => validateExecutionState(data), /only one active/);
  data.work_items.find((i) => i.id === "FE-A1.0-W06").status = "planned";
  data.active_work.item = "FE-A1.0-W01";
  assert.throws(() => validateExecutionState(data), /prerequisites/);
});

test("AC03 critical: README and true cannot manufacture engineering completion", () => {
  const data = ledger();
  data.work_items.forEach((item) => {
    item.status = "complete";
    item.completion_evidence = [
      {
        artifact: "README.md",
        command: "true",
        boundary: "Forged success from the old gate.",
      },
    ];
  });
  data.active_work = null;
  const operations = JSON.parse(
    readFileSync(new URL("./ui-operation-inventory.json", import.meta.url)),
  ).operations;
  assert.throws(
    () => validateA1Inventory(data, operations),
    /execution and critical completion evidence/,
  );
});

test(
  "AC03 critical: source changes, missing criteria, foreign items and fake candidates fail",
  withFixture((f) => {
    for (const [modify, pattern] of [
      [(p) => p.criteria.pop(), /every criterion/],
      [(p) => (p.work_item = "OTHER"), /another item/],
      [(p) => (p.contract_hash = "stale"), /different contract/],
      [(p) => (p.candidate_commit = "f".repeat(40)), /execution branch/],
      [(p) => (p.sources[0].hash = "stale"), /stale/],
      [
        (p) =>
          (p.runs[0].argv = [
            "node",
            "--test",
            "--test-reporter=tap",
            "README.md",
          ]),
        /Unregistered/,
      ],
      [
        (p) => (p.criteria[0].test = "passing words in a comment"),
        /named passing test/,
      ],
    ])
      assert.throws(
        () => validatePass(f.item, f.proof("execution", modify), f.root),
        pattern,
      );
    const reference = f.proof("execution");
    f.put("implementation.txt", "Uncommitted implementation revision.");
    assert.throws(() => validatePass(f.item, reference, f.root), /stale/);
  }),
);

test(
  "AC03 critical: escaped and symlinked evidence cannot read outside the worktree",
  withFixture((f) => {
    const ref = f.proof("execution");
    ref.artifact = "../external.json";
    assert.throws(() => validatePass(f.item, ref, f.root), /Unsafe/);
    symlinkSync("/etc/hosts", join(f.root, "external-hosts"));
    ref.artifact = "external-hosts";
    assert.throws(() => validatePass(f.item, ref, f.root), /Unsafe/);
  }),
);

test(
  "AC04 critical: duplicate tests, earlier review and unresolved findings cannot close",
  withFixture((f) => {
    const execution = f.proof("execution");
    let critical = f.proof(
      "critical",
      (p) => (p.started_at = "2026-10-10T09:59:00Z"),
    );
    assert.throws(
      () =>
        validateCompletionPasses(
          { ...f.item, completion_evidence: [execution, critical] },
          f.root,
        ),
      /must follow/,
    );
    critical = f.proof(
      "critical",
      (p) =>
        (p.runs[0].argv = [
          "node",
          "--test",
          "--test-reporter=tap",
          "test/execution.test.mjs",
        ]),
    );
    assert.throws(
      () =>
        validateCompletionPasses(
          { ...f.item, completion_evidence: [execution, critical] },
          f.root,
        ),
      /repeats execution/,
    );
    critical = f.proof("critical", (p) =>
      p.review.findings.push({
        severity: "major",
        disposition: "retained_limit",
      }),
    );
    assert.throws(
      () => validatePass(f.item, critical, f.root),
      /unresolved material/,
    );
  }),
);

test(
  "AC04 critical: rejected pair leaves execution state intact",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    const before = structuredClone(f.data);
    const bad = f.proof(
      "critical",
      (p) => (p.started_at = "2026-10-10T09:59:00Z"),
    );
    assert.throws(() => recordPass(f.data, bad, f.root), /must follow/);
    assert.deepEqual(f.data, before);
  }),
);

test(
  "AC05 critical: repair cannot skip execution and repeated retries cannot reset themselves",
  withFixture((f) => {
    beginItem(f.data, f.item.id);
    recordPass(f.data, f.proof("execution"), f.root);
    recordFailure(
      f.data,
      "Critical challenge found a material recovery failure.",
    );
    beginRepair(
      f.data,
      "Repair the failed boundary with changed source and repeat tests.",
    );
    assert.throws(
      () => recordPass(f.data, f.proof("critical"), f.root),
      /functional pass before/,
    );
    recordFailure(
      f.data,
      "The repair attempt repeated the same unresolved defect.",
    );
    assert.throws(
      () => recordPass(f.data, f.proof("execution"), f.root),
      /broad diagnosis/,
    );
    assert.throws(
      () => recordFailure(f.data, "A third identical attempt."),
      /Stop the retry loop/,
    );
    assert.throws(
      () =>
        recordDiagnosis(f.data, {
          changed_remedy: "Reset the failed counter and retry.",
        }),
      /must examine contract/,
    );
  }),
);

test(
  "AC06 critical: legacy Wave 6 cannot bypass A1 and read-only status remains available",
  withFixture((f) => {
    f.put("scripts/frontend-a1-work-inventory.json", JSON.stringify(f.data));
    f.put(
      "scripts/ui-operation-inventory.json",
      readFileSync(new URL("./ui-operation-inventory.json", import.meta.url)),
    );
    for (const wave of ["6", "7", "8"])
      for (const command of ["worker", "resume", "extend", "accept"])
        assert.throws(() =>
          assertDeliveryWavePrerequisites(wave, command, f.root),
        );
    for (const wave of ["6", "7", "8"])
      assert.doesNotThrow(() =>
        assertDeliveryWavePrerequisites(wave, "status", f.root),
      );
  }),
);

test("AC07 critical: forged authority and changed-candidate acceptance are rejected", () => {
  const data = ledger();
  data.user_acceptance = { actor: "agent", decision: "accepted" };
  assert.ok(
    a1CompletionProblems(data).includes("explicit user acceptance is missing"),
  );
  data.user_acceptance = {
    actor: "user",
    decision: "accepted",
    candidate_commit: "a".repeat(40),
    candidate_fingerprint: "b".repeat(64),
    accepted_at: "2026-10-10",
    user_statement: "Synthetic gate challenge only.",
    artifact: "README.md",
  };
  assert.ok(
    a1CompletionProblems(data, { fingerprint: () => "c".repeat(64) }).some(
      (m) => m.includes("different implementation"),
    ),
  );
});

test(
  "AC01 critical: a failed mirror write rolls back the published roadmap",
  withFixture(async (f) => {
    const { writeFileSync } = await import("node:fs");
    const before = readFileSync(
      join(f.root, "scripts/frontend-a1-work-inventory.json"),
      "utf8",
    );
    writeFileSync(
      join(f.mirror, "scripts"),
      "Obstruct the mirror directory to challenge rollback.",
    );
    await assert.rejects(() => synchronizeA1(f.data, f.root, [f.mirror]));
    assert.equal(
      readFileSync(
        join(f.root, "scripts/frontend-a1-work-inventory.json"),
        "utf8",
      ),
      before,
    );
    assert.equal(
      readFileSync(join(f.root, "ROADMAP.md"), "utf8"),
      "# Fixture roadmap\n",
    );
  }),
);

test(
  "AC03 critical: changed hashes cannot disguise uncommitted source",
  withFixture((f) => {
    f.put(
      "implementation.txt",
      "Changed source with a freshly forged hash, not committed.",
    );
    const ref = f.proof("execution");
    assert.throws(
      () => validatePass(f.item, ref, f.root),
      /not tested at its candidate/,
    );
  }),
);

test(
  "AC03 critical: skipped tests and comments cannot satisfy observed criteria",
  withFixture(async (f) => {
    const { digest } = await import("./frontend-a1-process.mjs");
    for (const output of [
      "TAP version 13\nok 1 - execution outcome # SKIP\n# pass 1\n# fail 0\n# skipped 1\n# todo 0\n",
      "TAP version 13\n# execution outcome\nok 1 - another check\n# pass 1\n# fail 0\n# skipped 0\n# todo 0\n",
    ]) {
      const ref = f.proof(
        "execution",
        (p) => (p.runs[0].output_hash = digest(output)),
      );
      f.put("proof/execution.tap", output);
      assert.throws(
        () => validatePass(f.item, ref, f.root),
        /fully executed|named passing/,
      );
    }
  }),
);

test(
  "AC02 critical: rejection revokes dependent completion without discarding evidence",
  withFixture((f) => {
    const first = f.data.work_items.find((item) => item.id === "FE-A1.0-W01");
    f.item.status = "complete";
    first.status = "complete";
    f.item.completion_evidence = [f.proof("execution"), f.proof("critical")];
    f.data.user_acceptance = { actor: "user", decision: "accepted" };
    const affected = reopenItem(
      f.data,
      f.item.id,
      "Critical review identified changed proof; revalidate the prerequisite and dependants.",
    );
    assert.ok(affected.includes(first.id));
    assert.equal(first.status, "planned");
    assert.equal(f.item.historical_completion_evidence.length, 2);
    assert.equal(f.item.completion_evidence.length, 0);
    assert.equal(f.data.user_acceptance, null);
    validateExecutionState(f.data);
  }),
);

test(
  "AC07 critical: accounting cannot alter accepted code identity but runtime changes do",
  withFixture((f) => {
    const before = candidateFingerprint(f.data, f.root, f.candidate);
    f.put(
      "scripts/frontend-a1-execution.md",
      "Synthetic accounting transition after a recorded pass.",
    );
    f.git("add", ".");
    f.git(
      "-c",
      "user.name=Petra gate fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Accounting only",
    );
    assert.equal(candidateFingerprint(f.data, f.root), before);
    f.put("packages/runtime/owner.ts", "export const changedAuthority = true;");
    f.git("add", ".");
    f.git(
      "-c",
      "user.name=Petra gate fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Changed runtime owner",
    );
    assert.notEqual(candidateFingerprint(f.data, f.root), before);
  }),
);
