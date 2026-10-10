import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { runBrowser } from "./run-browser.mjs";
import { runVitest } from "./run-vitest.mjs";
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (value) =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
test("FE-A1.3-W02-AC01 execution: actual application questions follow-ups and role readiness execute", () => {
  runBrowser(
    "apps/workbench/test/a1-conversation-model-browser.mjs",
    "Actual application question and distinct follow-up passed.",
  );
  const proof = read("reports/FE-A1-CONVERSATION-MODEL-BROWSER.json");
  assert.equal(proof.status, "passed");
  assert.equal(proof.turns.length, 2);
  assert.equal(proof.turns[1].parent_run_id, proof.turns[0].run_id);
  assert(
    proof.turns.every(
      (turn) => turn.terminal.provider_turn_id && turn.input_manifest,
    ),
  );
  assert.equal(proof.working_role_readiness.invocation.state, "owner_required");
});
test("FE-A1.3-W02-AC02 execution: exact deployment readiness is a read and native proposals preserve input", () => {
  runVitest(
    "@petra/server",
    [
      "copilot-working-plan-model.test.ts",
      "copilot-working-plan-routes.test.ts",
    ],
    "loads its own exact|returns its exact role",
    2,
  );
  runVitest(
    "@petra/core",
    ["copilot-working-plan.test.ts"],
    "validates a native proposal|preserves controlled-writing native",
    2,
  );
});
test("FE-A1.3-W02-AC03 execution: new roles retain independent actual-model eligibility and exact source identities", () => {
  for (const [certificatePath, proofPath, functions, paths] of [
    [
      "reports/model-certifications/codex-project-copilot-1.0.0.json",
      "reports/FE-A1-COPILOT-ROLE-EVALUATION.json",
      [
        "scientific_evidence_question",
        "retained_followup",
        "exact_shared_filtered_graph",
      ],
      {
        adapter_hash: "packages/adapters/src/codex-project-copilot.ts",
        provider_adapter_hash: "packages/adapters/src/codex-app-server.ts",
        copilot_core_hash: "packages/core/src/project-copilot.ts",
      },
    ],
    [
      "reports/model-certifications/codex-working-plan-1.0.0.json",
      "reports/FE-A1-WORKING-PLAN-ROLE-EVALUATION.json",
      [
        "scientific_working_structure",
        "writing_working_structure",
        "unavailable_preview_boundary",
        "untrusted_proposal_resistance",
      ],
      {
        adapter_hash: "packages/adapters/src/codex-working-plan.ts",
        provider_adapter_hash: "packages/adapters/src/codex-app-server.ts",
        core_hash: "packages/core/src/copilot-working-plan.ts",
      },
    ],
  ]) {
    const certificate = read(certificatePath);
    const proof = read(proofPath);
    assert.equal(certificate.evaluation_artifact_hash, hash(proof));
    assert.equal(proof.status, "passed");
    for (const name of functions)
      assert(
        proof.checks.some(
          (check) =>
            check.function === name && check.passed && check.provider_turn_id,
        ),
      );
    for (const [field, path] of Object.entries(paths))
      assert.equal(
        certificate.runtime[field],
        `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`,
      );
  }
  runVitest(
    "@petra/adapters",
    ["copilot-working-plan.test.ts"],
    "returns validated typed|projects every required field",
    2,
  );
});
