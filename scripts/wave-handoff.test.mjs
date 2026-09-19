import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildCodexExecArguments,
  buildWorkerPrompt,
  canRetryUnchangedWorkerFailure,
  canRetryWorkerFailure,
  enforceCompletionDisposition,
  evidenceOwnerCanSatisfy,
  initialHandoff,
  inventoryAuditOverdue,
  isCompatiblePackageJsonConflictSet,
  isRetryableWorkerError,
  mergeAdditiveMarkdownDocuments,
  mergeOperationInventoryDocuments,
  mergePackageJsonDocuments,
  matchesRecoverySnapshot,
  missingRequiredEvidence,
  normalizePlannedEvidenceRecords,
  parseArguments,
  parsePorcelainZ,
  resolveCompatiblePackageJsonConflict,
  unexpectedChanges,
  validateEvidencePlan,
  validateCommitTransition,
  validatePriorWaveState,
  validateWorkerResult,
  worktreeDigest,
} from "./wave-handoff.mjs";

const evidencePlan = {
  schema_version: 1,
  wave: "5",
  inventory_audit: {
    evidence_id: "WAVE5-EVIDENCE-CONTROL",
    scenario_id: "inventory-audit",
    owner: "design",
    description: "Reconcile planned and executed evidence.",
    required_by_completed_slice: 6,
  },
  remediation_reserve_slices: 2,
  required: [
    {
      evidence_id: "UX1.5-EV03",
      scenario_id: "graph-keyboard-path",
      owner: "design",
      description: "Execute the keyboard graph path.",
    },
  ],
};

const evidenceRecord = {
  evidence_id: "UX1.5-EV03",
  scenario_id: "graph-keyboard-path",
  status: "passed",
  command: "npm run test:wave5:browser",
  artifact: "reports/WAVE5-GRAPH-EVIDENCE.md",
  boundary: "Headless Chrome with production clients and live routes.",
};

test("uses automatic approval review without a conflicting sandbox flag", () => {
  const args = buildCodexExecArguments({
    root: "/tmp/backend",
    outputPath: "/tmp/result.json",
  });
  assert.ok(args.includes("--approve-for-me"));
  assert.equal(args.includes("--sandbox"), false);
});

test("parses explicit user acceptance without treating it as worker authority", () => {
  assert.deepEqual(
    parseArguments([
      "accept",
      "--wave",
      "6",
      "--evidence-id",
      "USER-TESTABLE-01",
      "--scenario-id",
      "explicit-product-acceptance",
    ]),
    {
      command: "accept",
      wave: "6",
      role: undefined,
      maxSlices: 64,
      evidenceId: "USER-TESTABLE-01",
      scenarioId: "explicit-product-acceptance",
    },
  );
  assert.equal(evidenceOwnerCanSatisfy("user", "backend"), false);
  assert.equal(evidenceOwnerCanSatisfy("user", "design"), false);
  assert.equal(evidenceOwnerCanSatisfy("user", "user"), true);
});

test("normalizes only an exact concatenated frozen evidence key", () => {
  const malformed = {
    ...evidenceRecord,
    evidence_id: "UX1.5-EV03/graph-keyboard-path",
    scenario_id: "UX1.5-EV03/graph-keyboard-path",
  };
  assert.deepEqual(normalizePlannedEvidenceRecords(evidencePlan, [malformed]), [
    evidenceRecord,
  ]);
  const unknown = {
    ...malformed,
    evidence_id: "UNKNOWN/scenario",
    scenario_id: "UNKNOWN/scenario",
  };
  assert.deepEqual(normalizePlannedEvidenceRecords(evidencePlan, [unknown]), [
    unknown,
  ]);
});

test("retries only unchanged transient worker failures with a bounded attempt count", () => {
  const commit = "a".repeat(40);
  const state = {
    status: "running",
    commits: { backend: commit, design: commit },
    active: { role: "backend", attempt: 1 },
  };
  const clean = {
    backend: { head: commit, remote: commit, unexpected: [] },
    design: { head: commit, remote: commit, unexpected: [] },
  };
  assert.equal(
    isRetryableWorkerError(
      new Error("Codex backend worker exited with status 1. Logs: run.jsonl"),
    ),
    true,
  );
  assert.equal(
    isRetryableWorkerError(new Error("Design synchronization failed.")),
    false,
  );
  assert.equal(canRetryUnchangedWorkerFailure(state, clean), true);
  assert.equal(
    canRetryUnchangedWorkerFailure(
      { ...state, active: { role: "backend", attempt: 3 } },
      clean,
    ),
    false,
  );
  assert.equal(
    canRetryUnchangedWorkerFailure(state, {
      ...clean,
      backend: { ...clean.backend, head: "b".repeat(40) },
    }),
    false,
  );
  assert.equal(
    canRetryUnchangedWorkerFailure(state, {
      ...clean,
      design: {
        ...clean.design,
        unexpected: [{ status: " M", path: "package.json" }],
      },
    }),
    false,
  );
});

test("continues a transient failure from only the owning fingerprinted worktree", () => {
  const backendCommit = "a".repeat(40);
  const designCommit = "b".repeat(40);
  const dirtyDigest = `sha256:${"c".repeat(64)}`;
  const dirty = [{ status: " M", path: "packages/core/src/index.ts" }];
  const state = {
    status: "running",
    commits: { backend: backendCommit, design: designCommit },
    active: { role: "backend", attempt: 1 },
  };
  const snapshots = {
    backend: {
      head: backendCommit,
      remote: backendCommit,
      unexpected: dirty,
      worktree_digest: dirtyDigest,
    },
    design: {
      head: designCommit,
      remote: designCommit,
      unexpected: [],
      worktree_digest: `sha256:${"d".repeat(64)}`,
    },
  };
  assert.equal(canRetryWorkerFailure(state, snapshots), true);
  assert.equal(
    matchesRecoverySnapshot(
      {
        role: "backend",
        expected_commit: backendCommit,
        worktree_digest: dirtyDigest,
      },
      "backend",
      snapshots.backend,
    ),
    true,
  );
  assert.equal(
    matchesRecoverySnapshot(
      {
        role: "backend",
        expected_commit: backendCommit,
        worktree_digest: `sha256:${"e".repeat(64)}`,
      },
      "backend",
      snapshots.backend,
    ),
    false,
  );
  assert.equal(
    canRetryWorkerFailure(state, {
      ...snapshots,
      design: {
        ...snapshots.design,
        unexpected: [{ status: " M", path: "apps/workbench/src/App.tsx" }],
      },
    }),
    false,
  );

  const integratedHead = "c".repeat(40);
  const integrated = {
    ...snapshots,
    backend: {
      head: integratedHead,
      remote: backendCommit,
      unexpected: [],
      worktree_digest: `sha256:${"e".repeat(64)}`,
      remote_is_ancestor: true,
    },
  };
  assert.equal(canRetryWorkerFailure(state, integrated), true);
  assert.equal(
    matchesRecoverySnapshot(
      {
        role: "backend",
        expected_head: integratedHead,
        expected_remote: backendCommit,
        worktree_digest: integrated.backend.worktree_digest,
      },
      "backend",
      integrated.backend,
    ),
    true,
  );
  assert.equal(
    canRetryWorkerFailure(state, {
      ...integrated,
      backend: { ...integrated.backend, remote_is_ancestor: false },
    }),
    false,
  );
});

test("fingerprints exact tracked and untracked partial worktree bytes", () => {
  const root = mkdtempSync(join(tmpdir(), "petra-wave-recovery-"));
  const runGit = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  try {
    runGit("init", "--initial-branch=main");
    runGit("config", "user.name", "Wave Test");
    runGit("config", "user.email", "wave-test@example.invalid");
    writeFileSync(join(root, "tracked.txt"), "base\n");
    runGit("add", "tracked.txt");
    runGit("commit", "-m", "base");

    writeFileSync(join(root, "tracked.txt"), "partial one\n");
    const tracked = [{ status: " M", path: "tracked.txt" }];
    const first = worktreeDigest(root, tracked);
    writeFileSync(join(root, "tracked.txt"), "partial two\n");
    assert.notEqual(worktreeDigest(root, tracked), first);

    writeFileSync(join(root, "new.txt"), "new one\n");
    const untracked = [{ status: "??", path: "new.txt" }];
    const second = worktreeDigest(root, untracked);
    writeFileSync(join(root, "new.txt"), "new two\n");
    assert.notEqual(worktreeDigest(root, untracked), second);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("three-way merges compatible package.json changes", () => {
  const base = {
    name: "petra",
    scripts: { verify: "npm test", shared: "base" },
    devDependencies: { typescript: "6.0.3" },
  };
  const ours = {
    ...base,
    scripts: {
      ...base.scripts,
      "test:wave4:browser": "node browser.mjs",
      "test:wave4:item50": "npm run test:wave4:browser",
    },
  };
  const theirs = {
    ...base,
    scripts: {
      ...base.scripts,
      "test:wave4:evidence-support": "node evidence.mjs",
    },
  };
  const merged = JSON.parse(
    mergePackageJsonDocuments(
      JSON.stringify(base),
      JSON.stringify(ours),
      JSON.stringify(theirs),
    ),
  );
  assert.deepEqual(merged.scripts, {
    verify: "npm test",
    shared: "base",
    "test:wave4:browser": "node browser.mjs",
    "test:wave4:item50": "npm run test:wave4:browser",
    "test:wave4:evidence-support": "node evidence.mjs",
  });
});

test("three-way package merge preserves one-sided deletion and rejects competition", () => {
  const base = { scripts: { keep: "same", remove: "old", collide: "base" } };
  const ours = { scripts: { keep: "same", collide: "ours" } };
  const compatibleTheirs = {
    scripts: { keep: "same", remove: "old", collide: "base", add: "theirs" },
  };
  assert.deepEqual(
    JSON.parse(
      mergePackageJsonDocuments(
        JSON.stringify(base),
        JSON.stringify(ours),
        JSON.stringify(compatibleTheirs),
      ),
    ),
    { scripts: { keep: "same", collide: "ours", add: "theirs" } },
  );
  assert.throws(
    () =>
      mergePackageJsonDocuments(
        JSON.stringify(base),
        JSON.stringify(ours),
        JSON.stringify({
          scripts: { keep: "same", remove: "old", collide: "theirs" },
        }),
      ),
    /Competing JSON edits at package.json.scripts.collide/,
  );
});

test("merges independent operation ownership and UI-state changes by id", () => {
  const base = {
    schema_name: "petra.ui-operation-inventory",
    operations: [
      {
        id: "work.cancel",
        current_state: "unavailable",
        runtime_owner: "",
      },
    ],
  };
  const ours = {
    ...base,
    operations: [
      {
        ...base.operations[0],
        current_state: "partial",
      },
    ],
  };
  const theirs = {
    ...base,
    operations: [
      {
        ...base.operations[0],
        runtime_owner: "PostgresProjectWorkOperations.cancel",
      },
    ],
  };
  assert.deepEqual(
    JSON.parse(
      mergeOperationInventoryDocuments(
        JSON.stringify(base),
        JSON.stringify(ours),
        JSON.stringify(theirs),
      ),
    ).operations,
    [
      {
        id: "work.cancel",
        current_state: "partial",
        runtime_owner: "PostgresProjectWorkOperations.cancel",
      },
    ],
  );
});

test("merges disjoint Wave coverage sections without conflict markers", () => {
  const base = "# Coverage\n\n## Updates\n\n## Exit\n";
  const ours =
    "# Coverage\n\n## Updates\n\n### Slice 6 design\n\nDesign result.\n\n## Exit\n";
  const theirs =
    "# Coverage\n\n## Updates\n\n### Slice 7 backend\n\nBackend result.\n\n## Exit\n";
  const merged = mergeAdditiveMarkdownDocuments(base, ours, theirs);
  assert.match(merged, /### Slice 6 design/);
  assert.match(merged, /### Slice 7 backend/);
  assert.doesNotMatch(merged, /<<<<<<<|=======|>>>>>>>/);
});

test("automatic conflict recovery stays inside the package.json boundary", () => {
  assert.equal(isCompatiblePackageJsonConflictSet(["package.json"]), true);
  assert.equal(isCompatiblePackageJsonConflictSet(["README.md"]), false);
  assert.equal(
    isCompatiblePackageJsonConflictSet(["package.json", "package-lock.json"]),
    false,
  );
  assert.throws(
    () => mergePackageJsonDocuments("not json", "{}", "{}"),
    /invalid JSON/,
  );
});

test("resolves and commits a real additive package.json merge conflict", () => {
  const root = mkdtempSync(join(tmpdir(), "petra-wave-merge-"));
  const runGit = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const writePackage = (scripts) =>
    writeFileSync(
      join(root, "package.json"),
      `${JSON.stringify({ name: "petra", scripts }, null, 2)}\n`,
    );
  try {
    runGit("init", "--initial-branch=design/m1-ux");
    runGit("config", "user.name", "Wave Test");
    runGit("config", "user.email", "wave-test@example.invalid");
    writePackage({ verify: "npm test" });
    runGit("add", "package.json");
    runGit("commit", "-m", "base");
    runGit("branch", "backend");

    writePackage({
      verify: "npm test",
      "test:wave4:browser": "node browser.mjs",
    });
    runGit("add", "package.json");
    runGit("commit", "-m", "design command");

    runGit("checkout", "backend");
    writePackage({
      verify: "npm test",
      "test:wave4:evidence-support": "node evidence.mjs",
    });
    runGit("add", "package.json");
    runGit("commit", "-m", "backend command");
    runGit("checkout", "design/m1-ux");

    const merge = spawnSync(
      "git",
      ["merge", "--no-ff", "backend", "-m", "integrate backend"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(merge.status, 1, merge.stderr || merge.stdout);
    assert.equal(resolveCompatiblePackageJsonConflict(root), true);

    const merged = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.deepEqual(merged.scripts, {
      verify: "npm test",
      "test:wave4:browser": "node browser.mjs",
      "test:wave4:evidence-support": "node evidence.mjs",
    });
    assert.equal(runGit("diff", "--name-only", "--diff-filter=U").trim(), "");
    assert.equal(
      runGit("rev-list", "--parents", "-n", "1", "HEAD").trim().split(" ")
        .length,
      3,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parses worker options with a bounded slice count", () => {
  assert.deepEqual(parseArguments(["doctor"]), {
    command: "doctor",
    role: undefined,
    wave: "4",
    maxSlices: 64,
    evidenceId: undefined,
    scenarioId: undefined,
  });
  assert.deepEqual(
    parseArguments([
      "worker",
      "--role",
      "backend",
      "--wave",
      "3",
      "--max-slices",
      "24",
    ]),
    {
      command: "worker",
      role: "backend",
      wave: "3",
      maxSlices: 24,
      evidenceId: undefined,
      scenarioId: undefined,
    },
  );
  assert.throws(
    () => parseArguments(["worker", "--max-slices", "0"]),
    /1 through 100/,
  );
});

test("builds a wave-specific initial handoff without prior-wave instructions", () => {
  const handoff = initialHandoff("4", "a".repeat(40), "b".repeat(40));
  assert.match(handoff, /Wave 4 packet/);
  assert.match(handoff, /first incomplete item/);
  assert.doesNotMatch(handoff, /Wave 3|SuggestedAction|episode 1\.2/);
});

test("requires the preceding automated wave to be complete", () => {
  assert.doesNotThrow(() => validatePriorWaveState("3", undefined));
  assert.doesNotThrow(() =>
    validatePriorWaveState("5", { wave: "4", status: "complete" }),
  );
  assert.throws(
    () => validatePriorWaveState("5", { wave: "4", status: "waiting" }),
    /Wave 4 is complete/,
  );
  assert.throws(
    () => validatePriorWaveState("5", { wave: "3", status: "complete" }),
    /Wave 4 is complete/,
  );
});

test("permits only the two exact untracked design assets", () => {
  const entries = parsePorcelainZ(
    "?? ChatGPT Image Aug 29, 2026, 04_21_35 PM.png\0?? Claim Form BASIC.pdf\0 M reports/changed.md\0?? surprise.txt\0",
  );
  const unexpected = unexpectedChanges(
    entries,
    new Set([
      "ChatGPT Image Aug 29, 2026, 04_21_35 PM.png",
      "Claim Form BASIC.pdf",
    ]),
  );
  assert.deepEqual(unexpected, [
    { status: " M", path: "reports/changed.md" },
    { status: "??", path: "surprise.txt" },
  ]);
});

test("rejects an incomplete or cross-commit worker handoff", () => {
  const commit = "a".repeat(40);
  const counterpart = "b".repeat(40);
  const valid = {
    role: "backend",
    disposition: "handoff",
    slice_id: "UX-REQ-003-preview-1",
    summary: "Implemented one slice.",
    commit,
    counterpart_commit: counterpart,
    verification: ["npm run verify"],
    evidence: [],
    next_safe_boundary: "Design mapping.",
    handoff_prompt: "Review the exact backend commit.",
    wave_exit_assessment: "Still open.",
    user_attention: "",
  };
  assert.equal(
    validateWorkerResult(valid, {
      role: "backend",
      counterpartCommit: counterpart,
    }),
    valid,
  );
  assert.throws(
    () =>
      validateWorkerResult(
        { ...valid, counterpart_commit: "c".repeat(40) },
        { role: "backend", counterpartCommit: counterpart },
      ),
    /different counterpart/,
  );
  assert.throws(
    () =>
      validateWorkerResult(
        { ...valid, handoff_prompt: "" },
        { role: "backend", counterpartCommit: counterpart },
      ),
    /must provide the counterpart handoff/,
  );
});

test("accepts verified no-change handoffs but rejects stopped work changes", () => {
  const before = "a".repeat(40);
  const after = "b".repeat(40);
  assert.equal(validateCommitTransition("handoff", before, before), false);
  assert.equal(validateCommitTransition("handoff", before, after), true);
  assert.equal(
    validateCommitTransition("wave_complete", before, before),
    false,
  );
  assert.throws(
    () => validateCommitTransition("blocked", before, after),
    /despite blocked/,
  );
});

test("the handoff output schema accepts the complete result", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("./wave-handoff-result.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(
    validate({
      role: "design",
      disposition: "handoff",
      slice_id: "UX-REQ-003-design-map-1",
      summary: "Mapped the bounded slice.",
      commit: "a".repeat(40),
      counterpart_commit: "b".repeat(40),
      verification: ["npm run verify"],
      evidence: [],
      next_safe_boundary: "Backend invocation slice.",
      handoff_prompt: "Implement the next bounded backend slice.",
      wave_exit_assessment: "The exit gate remains open.",
      user_attention: "",
    }),
    true,
    JSON.stringify(validate.errors),
  );
});

test("validates the frozen evidence plan and enforces its audit reserve", () => {
  assert.equal(
    validateEvidencePlan(evidencePlan, { wave: "5", maxSlices: 8 }),
    evidencePlan,
  );
  assert.throws(
    () =>
      validateEvidencePlan(
        { ...evidencePlan, remediation_reserve_slices: 1 },
        { wave: "5", maxSlices: 8 },
      ),
    /reserve at least two slices/,
  );
  assert.throws(
    () => validateEvidencePlan(evidencePlan, { wave: "5", maxSlices: 7 }),
    /reserve at least two slices/,
  );
});

test("Wave 5 freezes its complete inventory before the eight-slice reserve", () => {
  const plan = JSON.parse(
    readFileSync(
      new URL("./wave-handoff-wave-5.evidence.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(validateEvidencePlan(plan, { wave: "5", maxSlices: 32 }), plan);
  assert.equal(plan.inventory_audit.required_by_completed_slice, 24);
  assert.equal(plan.remediation_reserve_slices, 8);
  assert.equal(plan.required.length, 24);
  assert.equal(
    plan.required.filter(({ owner }) => owner === "backend").length,
    7,
  );
  assert.equal(
    plan.required.filter(({ owner }) => owner === "design").length,
    17,
  );
  assert.deepEqual(
    new Set(plan.required.map(({ evidence_id }) => evidence_id)),
    new Set([
      "M1.7-AC01",
      "M1.7-AC02",
      "M1.7-AC03",
      "M1.7-AC04",
      "M1.7-AC05",
      "M1.7-AC06",
      "M1.7-AC07",
      "UX1.5-EV01",
      "UX1.5-EV02",
      "UX1.5-EV03",
      "UX1.5-EV04",
    ]),
  );
});

test("Waves 6 through 8 require operation gates and explicit user acceptance", () => {
  const expectations = {
    6: /gate:wave6:user-testable/,
    7: /gate:wave7:composition/,
    8: /gate:wave8:application/,
  };
  for (const [wave, gate] of Object.entries(expectations)) {
    const plan = JSON.parse(
      readFileSync(
        new URL(`./wave-handoff-wave-${wave}.evidence.json`, import.meta.url),
        "utf8",
      ),
    );
    const packet = readFileSync(
      new URL(`./wave-handoff-wave-${wave}.md`, import.meta.url),
      "utf8",
    );
    assert.equal(validateEvidencePlan(plan, { wave, maxSlices: 64 }), plan);
    assert.equal(plan.inventory_audit.required_by_completed_slice, 20);
    assert.equal(plan.remediation_reserve_slices, 44);
    assert.equal(
      plan.required.filter(({ owner }) => owner === "user").length,
      1,
    );
    assert.match(packet, gate);
    assert.match(packet, /needs_user/);
    assert.equal(
      enforceCompletionDisposition("wave_complete", plan, []),
      "handoff",
    );
    assert.equal(
      enforceCompletionDisposition("needs_user", plan, []),
      "handoff",
    );
    const automatedEvidence = [plan.inventory_audit, ...plan.required]
      .filter(({ owner }) => owner !== "user")
      .map((requirement) => ({ ...requirement, status: "passed" }));
    assert.equal(
      enforceCompletionDisposition("needs_user", plan, automatedEvidence),
      "needs_user",
    );
  }
});

test("Wave 6 backend launcher identifies its role and extended remediation budget", () => {
  const path = new URL("../run-wave-6-backend.zsh", import.meta.url);
  const launcher = readFileSync(path, "utf8");
  assert.match(launcher, /Petra Wave 6 Backend/);
  assert.match(launcher, /--role backend --wave 6 --max-slices 64/);
  assert.match(launcher, /doctor --wave 6 --max-slices 64/);
  assert.notEqual(statSync(path).mode & 0o111, 0);
});

test("Wave 5 packet fixes 32 alternating slices and the closure reserve", () => {
  const packet = readFileSync(
    new URL("./wave-handoff-wave-5.md", import.meta.url),
    "utf8",
  );
  const slices = [...packet.matchAll(/^(\d+)\. \*\*(Backend|Design) —/gm)].map(
    ([, number, role]) => ({ number: Number.parseInt(number, 10), role }),
  );
  assert.equal(slices.length, 32);
  assert.deepEqual(
    slices.map(({ number }) => number),
    Array.from({ length: 32 }, (_, index) => index + 1),
  );
  for (const { number, role } of slices) {
    assert.equal(role, number % 2 === 1 ? "Backend" : "Design");
  }
  assert.match(
    packet,
    /Slices 25–32: protected remediation and closure reserve/,
  );
  assert.match(
    packet,
    /Literal 3D,\n {2}Reagraph adoption, and yFiles evaluation are outside this wave/,
  );
  assert.match(packet, /Wave 5 requires no\n {2}external model call/);
  assert.doesNotMatch(packet, /VoiceOver/);
});

test("Wave 5 worktree launcher identifies its role and fixed budget", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const role = branch === "design/m1-ux" ? "design" : "backend";
  const path = new URL(`../run-wave-5-${role}.zsh`, import.meta.url);
  const launcher = readFileSync(path, "utf8");
  assert.match(
    launcher,
    new RegExp(`Petra Wave 5 ${role === "backend" ? "Backend" : "Design"}`),
  );
  assert.match(launcher, new RegExp(`--role ${role} --wave 5 --max-slices 32`));
  assert.match(launcher, /doctor --wave 5 --max-slices 32/);
  assert.notEqual(statSync(path).mode & 0o111, 0);
});

test("tracks scenario execution and rejects premature completion", () => {
  assert.deepEqual(missingRequiredEvidence(evidencePlan, []), [
    evidencePlan.inventory_audit,
    evidencePlan.required[0],
  ]);
  assert.equal(inventoryAuditOverdue(evidencePlan, [], 5), false);
  assert.equal(inventoryAuditOverdue(evidencePlan, [], 6), true);
  assert.equal(
    enforceCompletionDisposition("wave_complete", evidencePlan, [
      evidenceRecord,
    ]),
    "handoff",
  );
  const completeEvidence = [
    {
      ...evidenceRecord,
      evidence_id: "WAVE5-EVIDENCE-CONTROL",
      scenario_id: "inventory-audit",
    },
    evidenceRecord,
  ];
  assert.equal(inventoryAuditOverdue(evidencePlan, completeEvidence, 6), false);
  assert.equal(
    enforceCompletionDisposition(
      "wave_complete",
      evidencePlan,
      completeEvidence,
    ),
    "wave_complete",
  );
});

test("worker evidence requires an invoked command, artifact, and boundary", () => {
  const commit = "a".repeat(40);
  const counterpart = "b".repeat(40);
  const valid = {
    role: "design",
    disposition: "handoff",
    slice_id: "wave5-graph-evidence",
    summary: "Executed one planned scenario.",
    commit,
    counterpart_commit: counterpart,
    verification: ["npm run verify"],
    evidence: [evidenceRecord],
    next_safe_boundary: "Reconcile the evidence inventory.",
    handoff_prompt: "Run the evidence inventory audit.",
    wave_exit_assessment: "One scenario remains.",
    user_attention: "",
  };
  assert.equal(
    validateWorkerResult(valid, {
      role: "design",
      counterpartCommit: counterpart,
    }),
    valid,
  );
  assert.throws(
    () =>
      validateWorkerResult(
        {
          ...valid,
          evidence: [{ ...evidenceRecord, command: "" }],
        },
        { role: "design", counterpartCommit: counterpart },
      ),
    /invalid execution record/,
  );
});

test("worker prompt fixes one-slice, commit, role, and stop boundaries", () => {
  const prompt = buildWorkerPrompt({
    role: "design",
    wave: "4",
    ownCommit: "a".repeat(40),
    counterpartCommit: "b".repeat(40),
    handoff: "Map the exact backend slice.",
    plan: "Exit gate evidence.",
  });
  assert.match(prompt, /unattended design worker for Wave 4/);
  assert.doesNotMatch(prompt, /design worker for backend Wave/);
  assert.match(prompt, /exactly ONE bounded slice/);
  assert.match(prompt, /commit and push/);
  assert.match(prompt, /unchanged clean and pushed commit/);
  assert.match(prompt, /coordinator merges required backend history/);
  assert.match(prompt, /presence in your branch is not a design edit/);
  assert.match(prompt, /Do not edit backend contracts/);
  assert.match(prompt, /return needs_user/);
  assert.match(prompt, /Map the exact backend slice/);
});

test("worker prompt distinguishes planned helpers from executed evidence", () => {
  const prompt = buildWorkerPrompt({
    role: "design",
    wave: "5",
    ownCommit: "a".repeat(40),
    counterpartCommit: "b".repeat(40),
    handoff: "Execute the graph keyboard path.",
    plan: "Exit only with executed evidence.",
    evidencePlan,
    recordedEvidence: [],
  });
  assert.match(prompt, /EXECUTED EVIDENCE CONTROL/);
  assert.match(prompt, /was not invoked is not evidence/);
  assert.match(prompt, /UX1\.5-EV03\/graph-keyboard-path/);
  assert.match(prompt, /completion claim is rejected/);
});

test("worker prompt preserves fingerprinted partial work after a transient failure", () => {
  const worktreeDigest = `sha256:${"f".repeat(64)}`;
  const prompt = buildWorkerPrompt({
    role: "backend",
    wave: "5",
    ownCommit: "a".repeat(40),
    counterpartCommit: "b".repeat(40),
    handoff: "Finish the same contract slice.",
    plan: "One bounded slice.",
    recovery: {
      role: "backend",
      expected_commit: "a".repeat(40),
      worktree_digest: worktreeDigest,
    },
  });
  assert.match(prompt, /TRANSIENT SLICE RECOVERY/);
  assert.match(prompt, new RegExp(worktreeDigest));
  assert.match(prompt, /Do not reset, discard, or broaden the slice/);
});
