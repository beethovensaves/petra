import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { ownedPostgres } from "./owned-postgres.mjs";
import { runVitest } from "./run-vitest.mjs";
import { PetraContractRegistry } from "@petra/contracts/validator";
const contracts = new PetraContractRegistry();
let database;
before(() => {
  database = ownedPostgres();
});
after(() => database?.close());
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const headers = {
  authorization: "Bearer petra-local-development",
  "content-type": "application/json",
};
const proof = () =>
  JSON.parse(
    readFileSync("reports/FE-A1-OUTCOME-DRAFTING-BROWSER.json", "utf8"),
  );
test("FE-A1.2-W01-AC01 critical: ambiguous and unknown capability selection cannot silently borrow another definition", async () => {
  runVitest(
    "@petra/postgres",
    ["project-profile-runtime.test.ts"],
    "fails closed for unknown profile|returns a safe unsupported taxonomy",
    2,
  );
  const request = structuredClone(
    proof().observations[0].draft.content.request,
  );
  request.example_ref = {
    profile_id: "project_template_01K6P000000000000000000001",
    profile_version: "99.99.99",
    content_hash: `sha256:${"0".repeat(64)}`,
  };
  contracts.assertValid("project-definition-draft-request", "1.0.0", request);
  const response = await fetch(
    `${origin}/api/queries/project-definition-drafts`,
    { method: "POST", headers, body: JSON.stringify(request) },
  );
  assert(response.status >= 400);
  const error = await response.json();
  assert.equal(
    error.error?.code,
    "PROJECT_DEFINITION_DRAFT_EXAMPLE_UNAVAILABLE",
  );
});
test("FE-A1.2-W01-AC02 critical: recomputed forged draft hashes and invented assumption acceptance cannot cross production command authority", async () => {
  const { draft } = proof().observations[2];
  const { canonicalize } = await import("json-canonicalize");
  const { createHash } = await import("node:crypto");
  const failures = [];
  for (const attack of ["content", "assumptions"]) {
    const changed = structuredClone(draft);
    if (attack === "content") {
      changed.content.definition_content.supported_places = ["brief"];
      changed.content_hash = `sha256:${createHash("sha256").update(canonicalize(changed.content)).digest("hex")}`;
    }
    const suffix = attack === "content" ? "7" : "8";
    const request = {
      schema_name: "petra.project-definition-draft-command-request",
      schema_version: "1.0.0",
      command_id: `command_01K6P000000000000000000${suffix}01`,
      idempotency_key: `a1-definition-critical:${attack}:${Date.now()}`,
      draft: changed,
      accepted_assumption_codes:
        attack === "content"
          ? changed.content.assumptions.map((a) => a.code)
          : ["unregistered.assumption"],
    };
    contracts.assertValid(
      "project-definition-draft-command-request",
      "1.0.0",
      request,
    );
    const response = await fetch(
      `${origin}/api/commands/projects/from-definition-draft`,
      { method: "POST", headers, body: JSON.stringify(request) },
    );
    assert(response.status >= 400);
    const error = await response.json();
    assert.equal(
      error.error?.code,
      attack === "content"
        ? "PROJECT_DEFINITION_DRAFT_STALE"
        : "PROJECT_DEFINITION_DRAFT_ASSUMPTIONS_UNACCEPTED",
    );
    failures.push({ attack, status: response.status, code: error.error.code });
  }
  runVitest(
    "@petra/postgres",
    ["project-profile-runtime.test.ts"],
    "serializes overlapping command and idempotency",
    1,
  );
  writeFileSync(
    "reports/FE-A1-OUTCOME-DRAFTING-CRITICAL.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        failures,
        boundary:
          "Independent actual production authority attacks and real isolated PostgreSQL idempotency/atomicity challenge. No accepted creation is requested against the inspection database.",
      },
      null,
      2,
    ) + "\n",
  );
});
test("FE-A1.2-W01-AC03 critical: missing optional example and whitespace outcome are handled before any Project creation", async () => {
  const request = structuredClone(
    proof().observations[2].draft.content.request,
  );
  assert.equal(request.example_ref, undefined);
  const response = await fetch(
    `${origin}/api/queries/project-definition-drafts`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ ...request, outcome: "   " }),
    },
  );
  assert(response.status >= 400);
  const error = await response.json();
  assert.equal(error.error?.code, "PROJECT_DEFINITION_DRAFT_INVALID");
  const before = proof().observations[2].draft.content.request.outcome;
  assert(before.trim().length > 0);
});
