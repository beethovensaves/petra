import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { ProjectCopilotClient } from "@petra/adapters/ag-ui";
import { runVitest } from "./run-vitest.mjs";
import { protocolDependencies } from "./presentation-boundary.mjs";
test("FE-A1.3-W05-AC01 critical: hostile disclosure cannot substitute content ownership order or outcomes and exact production replay creates no new run", async () => {
  runVitest(
    "@petra/adapters",
    ["copilot-progress.critical.test.ts"],
    "rejects hostile|withholds disclosure|refuses unsolicited|keeps genuine",
    4,
  );
  const proof = JSON.parse(
    readFileSync("reports/FE-A1-PROGRESSIVE-COPILOT-BROWSER.json", "utf8"),
  );
  const baseUrl = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
  const client = new ProjectCopilotClient({
    baseUrl,
    token: "petra-local-development",
  });
  const before = await client.read(proof.project_id);
  const retained = before.turns.find((turn) => turn.run_id === proof.run_id);
  assert(retained);
  assert.equal(retained.terminal.state, "completed");
  const input = {
    threadId: proof.sdk_input.threadId,
    runId: proof.sdk_input.runId,
    question: retained.question,
    request: proof.sdk_input.forwardedProps.petra,
  };
  const phases = [];
  await client.run(input, (state) => phases.push(state.phase));
  assert(phases.includes("completed"));
  await assert.rejects(
    client.run(
      {
        ...input,
        question: "Synthetic A1 conflicting replay must be rejected.",
      },
      () => undefined,
    ),
  );
  const foreign = new ProjectCopilotClient({
    baseUrl,
    token: "invalid-controlled-actor",
  });
  await assert.rejects(foreign.read(proof.project_id));
  const after = await client.read(proof.project_id);
  assert.equal(after.turns.length, before.turns.length);
  assert.deepEqual(
    after.turns.find((turn) => turn.run_id === proof.run_id),
    retained,
  );
  assert.deepEqual(after.owners[proof.run_id], before.owners[proof.run_id]);
  writeFileSync(
    "reports/FE-A1-PROGRESSIVE-COPILOT-CRITICAL.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        project_id: proof.project_id,
        run_id: proof.run_id,
        phases,
        immutable_owner: after.owners[proof.run_id],
        conflicting_replay: "rejected",
        foreign_read: "rejected",
        unchanged_retained_turn: true,
        boundary:
          "Separate hostile SDK/owner-port checks plus real production replay, identity-conflict rejection and denied authentication. No new model or Work invocation was inferred.",
      },
      null,
      2,
    ) + "\n",
  );
});
test("FE-A1.3-W05-AC02 critical: native Work tool and Review mappings reject unregistered custom authority and SDK subscriber-error loss", () => {
  runVitest(
    "@petra/adapters",
    ["copilot-progress.critical.test.ts"],
    "rejects unregistered native|maps native Work",
    2,
  );
});
test("FE-A1.3-W05-AC03 critical: protocol dependency guard catches imports and raw event interpretation concealed in a feature", () => {
  assert.deepEqual(
    protocolDependencies(
      'import { HttpAgent } from "@ag-ui/client";',
      "Feature.tsx",
    ),
    ["@ag-ui/client"],
  );
  assert.deepEqual(
    protocolDependencies(
      'if (event.type === "RUN_FINISHED") applyClaim();',
      "Feature.tsx",
    ),
    ["RUN_FINISHED"],
  );
  assert.deepEqual(
    protocolDependencies(
      'import type { CopilotPresentation } from "@petra/core/copilot-presentation";',
      "Feature.tsx",
    ),
    [],
  );
});
