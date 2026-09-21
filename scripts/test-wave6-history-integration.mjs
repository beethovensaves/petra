import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = process.env.PETRA_WAVE6_HISTORY_EVIDENCE_OUTPUT?.trim();

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 History authority trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}
if (output === undefined || output === "") {
  throw new Error(
    "PETRA_WAVE6_HISTORY_EVIDENCE_OUTPUT must name the retained authority artifact.",
  );
}

const temporaryRoot = mkdtempSync(
  resolve(tmpdir(), "petra-wave6-history-authority-"),
);
const backendPath = resolve(temporaryRoot, "backend.json");

const run = (program, args, environment = {}) =>
  new Promise((resolveRun) => {
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolveRun({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code, signal) => {
      resolveRun({ code: code ?? 1, signal, stdout, stderr });
    });
  });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

let failure;
try {
  const execution = await run(
    process.execPath,
    ["scripts/test-wave4-cumulative-integration.mjs"],
    {
      PETRA_WAVE4_TRACE: "wave6-history",
      PETRA_WAVE4_RESULT_OUTPUT: backendPath,
    },
  );
  if (execution.code !== 0) {
    throw new Error(
      `The live History authority trace failed (${execution.code ?? execution.signal}):\n${execution.stderr || execution.stdout}`,
    );
  }

  const backend = readJson(backendPath);
  const cumulative = backend.wave5_cumulative;
  const history = cumulative?.history_authority;
  assert.equal(backend.ok, true);
  assert.ok(
    history,
    "The production trace omitted the History authority bundle.",
  );
  assert.deepEqual(history.route_calls, {
    brief: 2,
    recent: 2,
    retained_list: 1,
    retained_filter: 2,
    episode: 1,
    impact: 1,
    recovery: 2,
    preview: 1,
    plan: 1,
    execute: 2,
  });
  assert.equal(
    history.applied_event.observed_effect.effect,
    "authority_change_applied",
  );
  assert.equal(history.applied_event.recovery_state, "eligible_for_preview");
  assert.equal(
    history.applied_event.project_definition_authority.state,
    "available",
  );
  assert.deepEqual(history.collection.filtered_event_ids, [
    history.applied_event.event_id,
  ]);
  assert.equal(history.governed_revert.completed_prefix, 3);
  assert.equal(
    history.governed_revert.replay_preflight,
    "retained_completion_replayed",
  );
  assert.equal(history.governed_revert.recovery_after, "already_compensated");
  assert.equal(
    history.governed_revert.preview_and_plan_changed_authority,
    false,
  );
  assert.equal(history.governed_revert.duplicate_effects, false);
  assert.equal(history.preservation.original_event_retained, true);
  assert.equal(history.preservation.compensation_event_retained, true);
  assert.ok(
    history.return_to_brief.recent_decision_event_ids.includes(
      history.return_to_brief.compensation_event_id,
    ),
    "The updated Brief omitted the retained compensation event.",
  );
  assert.equal(cumulative.restart_replay?.duplicate_effects, false);

  const artifact = {
    schema_name: "petra.wave6-history-authority-observation",
    schema_version: "1.0.0",
    artifact_kind: "wave6_operation_prerequisite",
    bundle_id: "history-recovery-governed-revert",
    status: "passed",
    recorded_at: new Date().toISOString(),
    command: "npm run test:wave6:history",
    operation_ids: [
      "brief.recent-decisions",
      "history.list",
      "history.filter",
      "history.open",
      "history.compare",
      "history.impact",
      "history.preview-revert",
      "history.execute-revert",
    ],
    environment: {
      node: process.versions.node,
      transport:
        "authenticated production HTTP through strict renderer-neutral History and Brief clients",
      stores: [
        "fresh PostgreSQL 18.6",
        "fresh SeaweedFS 4.41 S3",
        "fresh Neo4j 2026.07.1",
      ],
      server_restart_replay: true,
      browser_scenario_executed: false,
    },
    production_owners: {
      brief_recent_decisions: {
        route: "GET /api/queries/projects/:projectId/brief",
        calls: history.route_calls.brief,
        before_content_hash: history.return_to_brief.before_content_hash,
        after_content_hash: history.return_to_brief.after_content_hash,
        returned_compensation_event_id:
          history.return_to_brief.compensation_event_id,
      },
      recent_and_retained_history: {
        routes: [
          "GET /api/queries/projects/:projectId/history/recent",
          "GET /api/queries/projects/:projectId/history/events",
        ],
        calls:
          history.route_calls.recent +
          history.route_calls.retained_list +
          history.route_calls.retained_filter,
        unfiltered_content_hash: history.collection.unfiltered_content_hash,
        filtered_content_hash: history.collection.filtered_content_hash,
        exact_filters: history.collection.filters,
      },
      episode_compare_and_impact: {
        routes: [
          "GET /api/queries/projects/:projectId/history/events/:eventId",
          "GET /api/queries/projects/:projectId/history/events/:eventId/impact",
        ],
        event_id: history.applied_event.event_id,
        episode_content_hash: history.applied_event.episode_content_hash,
        impact_content_hash: history.applied_event.impact_content_hash,
        project_definition_authority:
          history.applied_event.project_definition_authority,
        impact_summary: history.applied_event.impact_summary,
      },
      recovery_preview_and_plan: {
        routes: [
          "GET /api/queries/projects/:projectId/history/events/:eventId/recovery",
          "GET /api/queries/projects/:projectId/history/events/:eventId/recovery/preview",
          "POST /api/queries/projects/:projectId/history/events/:eventId/recovery/plan",
        ],
        recovery_content_hash: history.applied_event.recovery_content_hash,
        preview_content_hash: history.governed_revert.preview_content_hash,
        plan_content_hash: history.governed_revert.plan_content_hash,
        read_only_before_execution:
          !history.governed_revert.preview_and_plan_changed_authority,
      },
      governed_revert_execution: {
        route:
          "POST /api/commands/projects/:projectId/history/events/:eventId/recovery/execute",
        calls: history.route_calls.execute,
        execution_content_hash: history.governed_revert.execution_content_hash,
        replay_content_hash: history.governed_revert.replay_content_hash,
        compensation_change_set_id:
          history.governed_revert.compensation_change_set_id,
        compensation_event_id: history.governed_revert.compensation_event_id,
        replay_preflight: history.governed_revert.replay_preflight,
      },
    },
    preservation: history.preservation,
    restart_replay: cumulative.restart_replay,
    authority_boundary: history.authority_boundary,
    boundary:
      "A fresh disposable-store trace invoked authenticated production Brief and History reads, exact retained filtering, one event-selected episode, historical definition comparison, impact, recovery assessment, read-only governed-Revert preview and confirmed plan, exact execution and replay, then returned to a Brief containing the additive compensation while preserving the original event. It proves backend owners, server principal binding, current authorization rechecks, persistence, canonical effects, recovery, preservation, and duplicate-effect protection. It did not execute visible browser controls and does not claim UX1.6-HISTORY/effect-recovery-revert-return or final design acceptance.",
  };
  writeFileSync(
    resolve(root, output),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  process.stdout.write(
    `Wave 6 History authority trace passed (${history.applied_event.event_id} -> ${history.governed_revert.compensation_event_id}).\n`,
  );
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
