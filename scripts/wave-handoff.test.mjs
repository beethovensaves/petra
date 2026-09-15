import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildCodexExecArguments,
  buildWorkerPrompt,
  enforceCompletionDisposition,
  initialHandoff,
  inventoryAuditOverdue,
  missingRequiredEvidence,
  parseArguments,
  parsePorcelainZ,
  unexpectedChanges,
  validateEvidencePlan,
  validateCommitTransition,
  validateWorkerResult,
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

test("parses worker options with a bounded slice count", () => {
  assert.deepEqual(parseArguments(["doctor"]), {
    command: "doctor",
    role: undefined,
    wave: "4",
    maxSlices: 32,
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
    { command: "worker", role: "backend", wave: "3", maxSlices: 24 },
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
