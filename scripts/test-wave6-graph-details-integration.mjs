import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = process.env.PETRA_WAVE6_GRAPH_DETAILS_EVIDENCE_OUTPUT?.trim();

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 Graph and Details authority trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}
if (output === undefined || output === "") {
  throw new Error(
    "PETRA_WAVE6_GRAPH_DETAILS_EVIDENCE_OUTPUT must name the retained authority artifact.",
  );
}

const temporaryRoot = mkdtempSync(
  resolve(tmpdir(), "petra-wave6-graph-details-authority-"),
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
      PETRA_WAVE4_TRACE: "wave6-graph-details",
      PETRA_WAVE4_RESULT_OUTPUT: backendPath,
    },
  );
  if (execution.code !== 0) {
    throw new Error(
      `The live Graph and Details trace failed (${execution.code ?? execution.signal}):\n${execution.stderr || execution.stdout}`,
    );
  }

  const backend = readJson(backendPath);
  const cumulative = backend.wave5_cumulative;
  const graph = cumulative?.graph_details_authority;
  assert.equal(backend.ok, true);
  assert.ok(graph, "The production trace omitted the Graph authority bundle.");
  assert.deepEqual(graph.route_calls, {
    focused_graph: 5,
    details: 1,
    analysis: 3,
    action_preview: 1,
  });
  assert.ok(
    [
      graph.positions.current,
      graph.positions.working,
      graph.positions.historical,
      graph.analysis.comparison,
      graph.analysis.impact,
      graph.analysis.time,
    ].every((value) => /^sha256:[0-9a-f]{64}$/u.test(value)),
    "The production trace omitted an exact Current, Working, Historical, comparison, impact, or time composition.",
  );
  assert.equal(graph.source_basis.inspection_state, "available");
  assert.equal(graph.exact_return.destination.state, "available");
  assert.deepEqual(graph.authority_boundary, {
    postgresql_authoritative: true,
    neo4j_projection_only: true,
    selection_is_presentation_state: true,
    details_are_read_only: true,
    analysis_is_read_only: true,
  });
  assert.equal(graph.analysis.assessed_consequences.state, "unavailable");
  assert.ok(cumulative?.identity?.focused_graph_content_hash);
  assert.ok(cumulative?.identity?.details_content_hash);
  assert.equal(cumulative?.open_review_graph?.command_issued, false);
  assert.equal(cumulative?.restart_replay?.duplicate_effects, false);
  assert.equal(
    cumulative?.restart_replay?.focused_graph_content_hash_before,
    cumulative?.restart_replay?.focused_graph_content_hash_after,
  );

  const artifact = {
    schema_name: "petra.wave6-graph-details-authority-observation",
    schema_version: "1.0.0",
    artifact_kind: "wave6_operation_prerequisite",
    bundle_id: "graph-details-source-basis-task-return",
    status: "passed",
    recorded_at: new Date().toISOString(),
    command: "npm run test:wave6:graph",
    operation_ids: [
      "graph.open",
      "graph.return",
      "graph.layer-position",
      "graph.select",
      "graph.open-details",
      "graph.open-source",
      "graph.compare",
      "graph.impact",
      "graph.time",
      "graph.correct-through-review",
      "details.open",
      "details.return",
    ],
    environment: {
      node: process.versions.node,
      transport:
        "authenticated production HTTP through the renderer-neutral FocusedGraphClient",
      stores: ["fresh PostgreSQL 18.6", "fresh Neo4j 2026.07.1"],
      restart_replay: true,
      browser_scenario_executed: false,
    },
    production_owners: {
      focused_graph: {
        route: "POST /api/queries/projects/:projectId/focused-graph",
        calls: graph.route_calls.focused_graph,
        content_hash: cumulative.identity.focused_graph_content_hash,
        layers: cumulative.layers,
        projection_position: cumulative.projection_position,
        positions: graph.positions,
      },
      details_and_source: {
        route: "POST /api/queries/projects/:projectId/focused-graph/details",
        calls: graph.route_calls.details,
        content_hash: cumulative.identity.details_content_hash,
        selection: graph.selection,
        inspected_source_state: graph.source_basis.inspection_state,
        source_span_id: graph.source_basis.source_span_id,
        source_inspection_content_hash:
          graph.source_basis.source_view_content_hash,
      },
      analysis: {
        route: "POST /api/queries/projects/:projectId/focused-graph/analysis",
        calls: graph.route_calls.analysis,
        results: graph.analysis,
      },
      governed_correction_preview: {
        route:
          "POST /api/queries/projects/:projectId/focused-graph/action-preview",
        calls: graph.route_calls.action_preview,
        review_session_id: cumulative.open_review_graph.review_session_id,
        review_member_id: cumulative.open_review_graph.review_member_id,
        working_relationship_id:
          cumulative.open_review_graph.working_relationship_id,
        working_relationship_revision:
          cumulative.open_review_graph.working_relationship_revision,
        preview_content_hash: cumulative.open_review_graph.preview_content_hash,
        command_issued: cumulative.open_review_graph.command_issued,
      },
    },
    exact_return: {
      graph_request_id: graph.exact_return.graph_request_id,
      destination: graph.exact_return.destination,
      selection: graph.selection,
    },
    restart_replay: cumulative.restart_replay,
    authority_boundary: {
      postgresql_authoritative: true,
      neo4j_projection_only: true,
      selection_is_presentation_state: true,
      details_and_analysis_are_read_only: true,
      correction_preview_issued_command: false,
      duplicate_effects: false,
    },
    boundary:
      "A fresh disposable PostgreSQL and Neo4j trace exercised authenticated production Graph, Details, exact-source, comparison, impact, recorded-time, and governed-preview routes through the strict renderer-neutral FocusedGraphClient, then restarted the server and replayed the exact graph read without changing durable cardinalities. It proves server owners, exact identity, read-only boundaries, and retained return data only. It did not execute a browser scenario and does not claim UX1.6-GRAPH/task-graph-details-return, visible selection/focus/return, expansion/filter/save, or final design acceptance.",
  };
  writeFileSync(
    resolve(root, output),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  process.stdout.write(
    `Wave 6 Graph and Details authority trace passed (${graph.route_calls.focused_graph} graph, ${graph.route_calls.details} Details, ${graph.route_calls.analysis} analysis, ${graph.route_calls.action_preview} preview calls).\n`,
  );
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
