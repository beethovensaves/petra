import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { focusedGraphV11Fixture } from "../packages/contracts/test/fixtures/focused-graph-view-v1-1.ts";
import { startPetraServer } from "../apps/server/src/server.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(
  root,
  process.env.PETRA_WAVE5_SLICE19_OUTPUT ??
    "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
);
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "petra-wave5-slice19-"));
const projectionObservationPath = resolve(
  temporaryRoot,
  "projection-observation.json",
);

const run = (program, args, options = {}) =>
  new Promise((resolveRun) => {
    const started = performance.now();
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...options.env },
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
      resolveRun({
        code: 1,
        stdout,
        stderr: error.message,
        elapsedMs: performance.now() - started,
      });
    });
    child.on("close", (code) => {
      resolveRun({
        code: code ?? 1,
        stdout,
        stderr,
        elapsedMs: performance.now() - started,
      });
    });
  });

const phase = async (id, command, args, options) => {
  process.stdout.write(`[wave5-slice19] ${id}\n`);
  const result = await run(command, args, options);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.code !== 0) {
    throw new Error(`${id} failed with exit code ${result.code}.`);
  }
  return {
    id,
    status: "passed",
    command: [command, ...args].join(" "),
    process_wall_time_ms: Number(result.elapsedMs.toFixed(3)),
  };
};

const token = "wave5-slice19-focused-graph";
const view = focusedGraphV11Fixture();
const request = {
  request_id: view.content.task.request_id,
  task_kind: "neighborhood",
  task_semantic_key: view.content.task.task_semantic_key,
  question: view.content.task.question,
  focus_ref: structuredClone(view.content.task.focus_refs[0]),
  origin: { origin_kind: "direct" },
  project_definition_ref: structuredClone(
    view.content.profile.project_definition_ref,
  ),
  semantic_layer: "current",
  temporal_position: {
    position_kind: "current",
    dimension: "project_snapshot",
  },
  object_semantic_key: "scientific.claim",
  relationship_semantic_key: "scientific.assertion",
  return_action_semantic_key: "scientific.graph.trace-sources",
  return_destination: structuredClone(view.content.destinations[0]),
  limits: structuredClone(view.content.scope.limits),
  expected_snapshot: structuredClone(view.content.requested_snapshot),
  exploration: {
    mode: "named_expansion",
    expansion_key: view.content.exploration.expansion_key,
    recipe_semantic_key: view.content.exploration.recipe_semantic_key,
    target_ref: structuredClone(view.content.exploration.target_ref),
    maximum_depth: view.content.exploration.maximum_depth,
    filters: structuredClone(view.content.exploration.filters),
  },
};
const authorized = {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(request),
};

const exerciseServerTransport = async () => {
  let releaseOlder;
  let confirmOlderArrived;
  const olderArrived = new Promise((resolveArrival) => {
    confirmOlderArrived = resolveArrival;
  });
  let reads = 0;
  const older = new Promise((resolveOlder) => {
    releaseOlder = () => resolveOlder(structuredClone(view));
  });
  const focusedGraphViews = {
    queryFocusedGraph: () => {
      reads += 1;
      if (reads === 1) {
        confirmOlderArrived?.();
        return older;
      }
      return Promise.resolve(structuredClone(view));
    },
  };
  let server = await startPetraServer({
    port: 0,
    authToken: token,
    focusedGraphViews,
  });
  const path = `/api/queries/projects/${view.project_id}/focused-graph`;
  const url = new URL(path, server.url);
  const olderStarted = performance.now();
  const olderResponsePromise = fetch(url, authorized);
  await olderArrived;
  const newerStarted = performance.now();
  const newerResponse = await fetch(url, authorized);
  const newerCompleted = performance.now();
  if (!newerResponse.ok) {
    throw new Error(
      `The newer server response failed (${newerResponse.status}).`,
    );
  }
  await newerResponse.json();
  releaseOlder?.();
  const olderResponse = await olderResponsePromise;
  const olderCompleted = performance.now();
  if (!olderResponse.ok) {
    throw new Error(
      `The older server response failed (${olderResponse.status}).`,
    );
  }
  await olderResponse.json();
  if (newerCompleted >= olderCompleted) {
    throw new Error(
      "The bounded late-response trace did not complete out of order.",
    );
  }

  const disconnectedUrl = new URL(path, server.url);
  await server.shutdown();
  let disconnectedError = "";
  let disconnected = false;
  try {
    await fetch(disconnectedUrl, {
      ...authorized,
      signal: AbortSignal.timeout(2_000),
    });
  } catch (error) {
    disconnected = true;
    disconnectedError = error instanceof Error ? error.name : "unknown";
  }
  if (!disconnected) {
    throw new Error("Expected the stopped production server delivery to fail.");
  }

  server = await startPetraServer({
    port: 0,
    authToken: token,
    focusedGraphViews: {
      queryFocusedGraph: () => Promise.resolve(structuredClone(view)),
    },
  });
  try {
    const retryStarted = performance.now();
    const retryResponse = await fetch(new URL(path, server.url), authorized);
    const retryCompleted = performance.now();
    if (!retryResponse.ok) {
      throw new Error(
        `The exact server retry failed (${retryResponse.status}).`,
      );
    }
    await retryResponse.json();
    return {
      production_http_server: true,
      older_response_ms: Number((olderCompleted - olderStarted).toFixed(3)),
      newer_response_ms: Number((newerCompleted - newerStarted).toFixed(3)),
      completion_order: ["newer", "older"],
      disconnected_error: disconnectedError,
      exact_retry_ms: Number((retryCompleted - retryStarted).toFixed(3)),
      exact_request_body_reused: true,
    };
  } finally {
    await server.shutdown();
  }
};

let failure;
try {
  if (process.version !== "v24.20.0") {
    throw new Error(
      `Wave 5 Slice 19 requires Node v24.20.0; found ${process.version}.`,
    );
  }
  const phases = [];
  phases.push(
    await phase("build", "npm", ["run", "build:packages"]),
    await phase("query-owner", "npm", [
      "test",
      "--workspace",
      "@petra/postgres",
      "--",
      "--run",
      "test/focused-graph-view-reader.test.ts",
    ]),
    await phase("server-route", "npm", [
      "test",
      "--workspace",
      "@petra/server",
      "--",
      "--run",
      "test/focused-graph-route.test.ts",
    ]),
    await phase("typed-client-recovery", "npm", [
      "test",
      "--workspace",
      "@petra/adapters",
      "--",
      "--run",
      "test/focused-graph-client.test.ts",
    ]),
    await phase("late-response-controller", "npm", [
      "test",
      "--workspace",
      "@petra/workbench",
      "--",
      "--run",
      "src/product/focused-graph-exploration.test.tsx",
    ]),
  );
  const server = await exerciseServerTransport();
  phases.push(
    await phase(
      "postgres-neo4j-projection",
      process.execPath,
      ["scripts/test-neo4j-integration.mjs"],
      {
        env: {
          PETRA_WAVE5_SLICE19_OBSERVATION: projectionObservationPath,
        },
      },
    ),
  );
  const projection = JSON.parse(
    readFileSync(projectionObservationPath, "utf8"),
  );
  const artifact = {
    schema_name: "petra.wave5-adverse-state-performance-observation",
    schema_version: "1.0.0",
    slice: "wave5-slice19",
    status: "pass",
    recorded_at: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      stores: projection.stores,
    },
    fixture: {
      dense_claims: projection.dense_claims,
      dense_relationships: projection.dense_relationships,
      bounded_relationships_returned: projection.bounded_relationships_returned,
      cycle_relationships_returned: projection.cycle_relationships_returned,
      finite_relationship_limit: 12,
    },
    observations: {
      server,
      query: {
        focused_query_ms: projection.focused_query_ms,
        dense_query_ms: projection.dense_query_ms,
      },
      projection: {
        initial_apply_ms: projection.projection_apply_ms,
        dense_apply_ms: projection.dense_projection_apply_ms,
        rebuild_ms: projection.projection_rebuild_ms,
        disconnected_read_error: projection.disconnected_read_error,
        retry_read_succeeded: projection.retry_read_succeeded,
      },
      phases,
    },
    exercised_states: {
      dense_and_cyclic: "passed",
      finite_limits_and_caps: "passed",
      stale_snapshot: "passed",
      late_response: "passed",
      restricted_and_missing_targets: "passed",
      projection_lag_and_rebuild: "passed",
      disconnect_and_exact_retry: "passed",
    },
    authority_boundary: {
      postgresql_authoritative: true,
      neo4j_rebuildable_projection: true,
      retry_is_a_read_delivery_retry: true,
      no_domain_command_or_effect_created_by_server_trace: true,
      timing_is_observation_not_product_truth: true,
    },
    evidence_boundary:
      "This backend support trace is verification for Slice 19. It is not the frozen UX1.5-EV04/dense-cyclic-performance browser record and does not supply render timing, layout stability, or browser accessibility evidence.",
  };
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
