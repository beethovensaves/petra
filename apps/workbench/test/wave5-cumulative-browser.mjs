import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { format } from "prettier";

const root = resolve(import.meta.dirname, "../../..");
const temporaryRoot = mkdtempSync(
  resolve(tmpdir(), "petra-wave5-browser-cumulative-"),
);
const adversePath = resolve(temporaryRoot, "adverse.json");
const livePath = resolve(temporaryRoot, "live.json");
const backendPath = resolve(temporaryRoot, "backend.json");
const artifactPath = resolve(
  root,
  "reports/WAVE5-CUMULATIVE-PRODUCTION-BROWSER-OBSERVATION.json",
);
const reportPath = resolve(
  root,
  "reports/WAVE5-CUMULATIVE-PRODUCTION-BROWSER-TRACE.md",
);
const backendSupportPath = resolve(
  root,
  "reports/WAVE5-PAIRED-PROFILE-CUMULATIVE-OBSERVATION.json",
);
const adverseSupportPath = resolve(
  root,
  "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 5 production browser trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const run = (label, args, environment = {}) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, {
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
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) {
        process.stdout.write(`[wave5-browser] ${label} passed\n`);
        resolveRun({ stdout, stderr });
      } else {
        const failureOutput = stderr || stdout;
        rejectRun(
          new Error(
            `${label} failed (${code ?? signal}):\n${
              failureOutput.length > 30_000
                ? `...[earlier output omitted]...\n${failureOutput.slice(-30_000)}`
                : failureOutput
            }`,
          ),
        );
      }
    });
  });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const parseJsonOutput = (value) => {
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first < 0 || last < first)
    throw new Error("Browser phase returned no JSON.");
  return JSON.parse(value.slice(first, last + 1));
};

let failure;
try {
  const pairedRun = await run("UX-FX24 paired-profile browser", [
    "apps/workbench/test/paired-profile-browser.mjs",
  ]);
  const paired = parseJsonOutput(pairedRun.stdout);
  if (paired.state !== "passed") throw new Error("UX-FX24 did not pass.");

  await run(
    "UX-FX25 adverse browser supplement",
    ["apps/workbench/test/wave5-adverse-browser.mjs"],
    { PETRA_WAVE5_ADVERSE_OUTPUT: adversePath },
  );
  const adverse = readJson(adversePath);
  if (adverse.status !== "pass") throw new Error("UX-FX25 did not pass.");

  await run(
    "fresh-store live production browser trace",
    ["scripts/test-wave4-cumulative-integration.mjs"],
    {
      PETRA_WAVE4_TRACE: "wave5-cumulative",
      PETRA_WAVE4_EVIDENCE_OBSERVER:
        "./apps/workbench/test/wave5-cumulative-evidence-observer.mjs",
      PETRA_WAVE5_BROWSER_OBSERVER_OUTPUT: livePath,
      PETRA_WAVE4_RESULT_OUTPUT: backendPath,
    },
  );
  const live = readJson(livePath);
  const backend = readJson(backendPath);
  if (
    live.status !== "passed" ||
    backend.ok !== true ||
    backend.boundary?.browser_scenarios_executed !== true
  ) {
    throw new Error(
      "The live browser observer did not complete its fresh-store trace.",
    );
  }

  const backendSupportBytes = readFileSync(backendSupportPath);
  const adverseSupportBytes = readFileSync(adverseSupportPath);
  const liveGraph = live.focused_graph;
  const artifact = {
    schema_name: "petra.wave5-cumulative-production-browser-observation",
    schema_version: "1.0.0",
    wave: 5,
    slice: 22,
    status: "passed",
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave5:browser",
    environment: {
      node: process.versions.node,
      browser: liveGraph.browser,
      platform: process.platform,
      architecture: process.arch,
      workbench: "production controllers and React Router loaders",
      renderer: "production Cytoscape renderer plus complete textual peer",
      live_stores: ["fresh PostgreSQL 18.6", "fresh Neo4j 2026.07.1"],
    },
    phases: {
      ux_fx24: {
        command: "node apps/workbench/test/paired-profile-browser.mjs",
        result: paired,
        boundary:
          "Real isolated Chrome over production Project, relationship-overlay, Review loaders, renderers, and textual peers. Transport is deterministic synthetic fixture transport; controlled-writing focused-query HTTP is not claimed live.",
      },
      ux_fx25: {
        command: "node apps/workbench/test/wave5-adverse-browser.mjs",
        artifact_sha256: sha256(readFileSync(adversePath)),
        browser: adverse.environment.browser,
        boundary:
          "Real isolated Chrome over production focused-graph components with deterministic injected typed transport. Used for adverse ordering, omissions, correction-preview convergence, and supplied-impact presentation; not relabeled as a live backend trace.",
      },
      live_routes: {
        command:
          "PETRA_WAVE4_TRACE=wave5-cumulative PETRA_WAVE4_EVIDENCE_OBSERVER=./apps/workbench/test/wave5-cumulative-evidence-observer.mjs node scripts/test-wave4-cumulative-integration.mjs",
        observation: live,
        boundary: live.route_boundary,
      },
    },
    support_only: {
      backend_cumulative_artifact: {
        path: "reports/WAVE5-PAIRED-PROFILE-CUMULATIVE-OBSERVATION.json",
        sha256: sha256(backendSupportBytes),
        boundary:
          "Backend evidence only. No browser record is inferred from this artifact.",
      },
      adverse_backend_artifact: {
        path: "reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json",
        sha256: sha256(adverseSupportBytes),
        boundary:
          "Backend timing and store support only. No browser record is inferred from this artifact.",
      },
    },
    scenario_records: [
      {
        evidence_id: "UX1.5-EV01",
        scenario_id: "paired-profile-bounded-graph-fixture",
        status: "passed",
        observation: {
          fixture: "UX-FX24",
          checks: paired.checks,
          limitation: paired.limitation,
        },
        boundary:
          "Scientific and controlled-writing fixtures executed in Chrome through the same production overlay mapper, renderer, textual peer, Project shell, and Review controller. The controlled-writing response is synthetic fixture transport, not a live focused-query response.",
      },
      {
        evidence_id: "UX1.5-EV02",
        scenario_id: "relation-identification-review",
        status: "passed",
        observation: liveGraph.relation_review,
        boundary:
          "Critic inspection of every relationship fact in the live Working changes result and its exact graph/text renderings; color and position were not used as identifying facts.",
      },
      {
        evidence_id: "UX1.5-EV02",
        scenario_id: "provenance-comprehension-review",
        status: "passed",
        observation: liveGraph.provenance_review,
        boundary:
          "Critic inspection of live Details and exact source inspection for basis, SourceSpan, ProjectSource representation, rights, snapshot, omissions, and projection position.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "contextual-entry-scope-selection-return-browser",
        status: "passed",
        observation: {
          contextual: liveGraph.contextual_entry,
          direct: liveGraph.direct_entry,
          focus: {
            contextual_heading: liveGraph.focus.contextual_heading,
            exact_return: liveGraph.focus.context_return,
          },
          timings_ms: {
            contextual: liveGraph.timings_ms.contextual_graph_ms,
            direct: liveGraph.timings_ms.direct_graph_ms,
          },
        },
        boundary:
          "The exact retained Review action target was composed with a projected baseline Claim because the post-Apply Claim had not reached Neo4j. That contextual Review URL and a separately parsed direct URL executed through the production loader and live focused-query route with exact return focus.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "current-working-historical-browser",
        status: "passed",
        observation: {
          positions: liveGraph.positions,
          projection_lag: live.projection_lag,
        },
        boundary:
          "Live Current, Working changes, exact retained Historical, comparison navigation, projection catching-up, and Return to current. Historical time was bound to the retained event matching the exact snapshot position.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "graph-text-parity-browser",
        status: "passed",
        observation: liveGraph.graph_text_parity,
        boundary:
          "The same live response rendered graph and complete textual peers; normalized relationship facts matched exactly and both exposed scope, destinations, actions, and limitations.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "keyboard-focus-browser",
        status: "passed",
        observation: {
          focus: liveGraph.focus,
          action_preview_focus:
            adverse.observations.correction_preview
              .preview_trigger_focus_restored,
          renderer_recovery: adverse.observations.renderer_recovery,
        },
        boundary:
          "Keyboard executed contextual entry, Graph/Text alternative, live Details, exact source disclosure, Details return, and exact Review return. UX-FX25 executed action-preview close/focus recovery and production renderer recovery; native screen-reader evaluation remains outside scope.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "named-expansion-omission-selection-browser",
        status: "passed",
        observation: {
          live_expansion: liveGraph.expansion,
          adverse_accounting: adverse.observations.dense,
          late_response: adverse.observations.late_response,
          stale_response: adverse.observations.stale_response,
        },
        boundary:
          "The live profile correctly failed closed because it registers no compatible named-expansion recipe for this exact layer, preserving selection. UX-FX25 executed named filters, expansion, caps, hidden, restricted, unknown, stale, and out-of-order completion behavior through production controllers with deterministic injected transport; no live expansion-route claim is made.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "correction-preview-shared-command-browser",
        status: "passed",
        observation: {
          live_route: liveGraph.correction_preview,
          executed_preview: adverse.observations.correction_preview,
        },
        boundary:
          "UX-FX25 dispatched a Cytoscape tap inside real Chrome and used the non-drag selection control to open equivalent production-controller requests to an existing candidate/Review preview; geometry was absent and no command was issued. The live route was also inspected and honestly failed closed because the open Review's exact relationship was outside that bounded result; no live action-preview response is claimed.",
      },
      {
        evidence_id: "UX1.5-EV03",
        scenario_id: "comparison-impact-time-browser",
        status: "passed",
        observation: {
          comparison_content_hash: liveGraph.positions.comparison,
          live_impact_route: liveGraph.positions.impact,
          time_content_hash: liveGraph.positions.time,
          supplement: adverse.observations.temporal_and_comparison,
          graph_text_parity_executed: {
            comparison: true,
            impact: true,
            time: true,
          },
        },
        boundary:
          "Dedicated comparison and recorded-time analyses executed through live production routes with exact positions, dates or unknown dates, limitations, and graph/text parity. The live impact route failed closed with FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE for the matching recent-History Claim target; UX-FX25 executed the production impact presentation with a deterministic typed view containing supplied consequences. No successful live impact response is claimed.",
      },
    ],
    limitations: [
      paired.limitation,
      "UX-FX25 uses deterministic injected frontend transport for adverse ordering and omission states; its fresh-store backend support remains a separate artifact.",
      "Chrome accessibility structure and keyboard focus were inspected; native screen-reader evaluation is outside Wave 5.",
      "Recorded route and renderer timings are one-environment observations, not an SLA or universal threshold.",
      "The live impact route rejected the matching recent-History Claim target as incompatible with the exact focused record. Backend Slice 23 must audit that identity composition; the successful impact presentation here uses deterministic injected transport.",
    ],
  };
  writeFileSync(
    artifactPath,
    await format(JSON.stringify(artifact), { parser: "json" }),
  );

  const report = `# Wave 5 cumulative production browser trace

Date: 2026-09-16

Slice: Wave 5 Slice 22

Backend counterpart: \`03ebddeb26dca4f16f637224296909a815e06b35\`

Status: executed and passed; mandatory evidence inventory and remediation remain open

## Result

\`npm run test:wave5:browser\` executed the ten previously outstanding design-owned UX1.5 records through three explicit browser boundaries: UX-FX24 paired-profile fixture transport, UX-FX25 adverse fixture transport, and a fresh-store authenticated live-route trace. The retained machine-readable observation is \`reports/WAVE5-CUMULATIVE-PRODUCTION-BROWSER-OBSERVATION.json\`.

The live phase used production React Router loaders, focused-graph controllers, the Cytoscape renderer, the complete textual peer, and authenticated server routes backed by fresh PostgreSQL and Neo4j stores. It exercised contextual and direct entry, Current, Working changes, an exact retained Historical position, comparison, time, synchronized Details, exact source inspection, Review return focus, projection catching up, and fail-closed expansion and impact responses. UX-FX25 executed named expansion, pointer and non-drag correction, and the supplied-impact presentation through production components with deterministic injected typed transport.

## Critic findings

- Every live relationship remained identifiable by profile term, predicate, direction, origin, authority layer, basis, source availability, and limitations without relying on color or layout.
- Live Details exposed exact basis references, SourceSpan and ProjectSource identity, reproducible representation, rights, requested and represented snapshots, omissions, temporal layer, and projection position.
- Graph and textual peers produced the same normalized relationship-fact hash: \`${liveGraph.graph_text_parity.normalized_facts_sha256}\`.
- At the UX-FX25 production-controller boundary, pointer and non-drag correction entry produced equivalent typed requests after request identity was removed; neither request contained renderer coordinates, pan, zoom, position, or layout.

## Honest boundaries

UX-FX24 ran in real Chrome through production UI code, but its controlled-writing graph packet remains deterministic synthetic transport because a controlled-writing focused-query HTTP composer is not installed. UX-FX25 likewise uses injected transport for adverse ordering and omission states. Neither is relabeled as a live backend trace.

The live scientific ProjectDefinition does not register a compatible named-expansion recipe for this semantic layer. The live workbench therefore exposed no expansion controls and preserved selection; named expansion itself is evidenced only at the UX-FX25 production-controller boundary.

The open live Review's exact WorkingRelationship was not a member of the available bounded focused result, so the live workbench did not offer an invalid correction preview for another relationship. Pointer and non-drag request convergence was executed at the UX-FX25 production-controller boundary; no live action-preview response is claimed.

The live impact request selected the recent-History event whose affected Claim object and revision matched the exact focused Claim, but the server rejected it with \`FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE\`. The UX-FX25 browser therefore executed the production impact surface with an injected typed dependency and supplied-consequence view; no successful live impact response is claimed. Backend Slice 23 must audit this exact identity boundary.

The exact backend cumulative artifact is referenced only as backend support at \`${artifact.support_only.backend_cumulative_artifact.sha256}\`. Fresh-store browser claims come from the live observer in this command, not from that earlier backend artifact. Chrome accessibility structure and focus were inspected; no native screen-reader result is claimed. Timings are observations from one environment, not product thresholds.

## Executed frozen records

${artifact.scenario_records.map((record) => `- \`${record.evidence_id}/${record.scenario_id}\`;`).join("\n")}

## Next safe boundary

Backend Slice 23 may perform the pre-inventory adversarial audit. It must preserve these exact scenario and artifact boundaries and must not declare Wave 5 complete. Design Slice 24 still owes the mandatory executed-inventory audit before remediation begins.
`;
  writeFileSync(reportPath, report);
  process.stdout.write(
    `[wave5-browser] retained ${artifact.scenario_records.length} scenario records in ${artifactPath}\n`,
  );
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
