import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildCodexExecArguments,
  buildWorkerPrompt,
  parseArguments,
  parsePorcelainZ,
  unexpectedChanges,
  validateWorkerResult,
} from "./wave-handoff.mjs";

test("uses automatic approval review without a conflicting sandbox flag", () => {
  const args = buildCodexExecArguments({
    root: "/tmp/backend",
    outputPath: "/tmp/result.json",
  });
  assert.ok(args.includes("--approve-for-me"));
  assert.equal(args.includes("--sandbox"), false);
});

test("parses worker options with a bounded slice count", () => {
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
      next_safe_boundary: "Backend invocation slice.",
      handoff_prompt: "Implement the next bounded backend slice.",
      wave_exit_assessment: "The exit gate remains open.",
      user_attention: "",
    }),
    true,
    JSON.stringify(validate.errors),
  );
});

test("worker prompt fixes one-slice, commit, role, and stop boundaries", () => {
  const prompt = buildWorkerPrompt({
    role: "design",
    wave: "3",
    ownCommit: "a".repeat(40),
    counterpartCommit: "b".repeat(40),
    handoff: "Map the exact backend slice.",
    plan: "Exit gate evidence.",
  });
  assert.match(prompt, /exactly ONE bounded slice/);
  assert.match(prompt, /Commit and push/);
  assert.match(prompt, /Do not edit backend contracts/);
  assert.match(prompt, /return needs_user/);
  assert.match(prompt, /Map the exact backend slice/);
});
